import csv
import io
import secrets
from datetime import date

from django.db.models import Count, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import BLOOD_GROUPS, Member
from apps.core.models import ListItem
from apps.core.permissions import IsCashier
from apps.core.sms import send_bulk, send_sms
from apps.core.utils import audit, check_upload, media_url, snapshot, to_webp

from . import services
from .models import Donation, DuesPayment, DuesSetting, Expense, Income, VerifyStatus
from .views import dues_months

V, P, R = VerifyStatus.VERIFIED, VerifyStatus.PENDING, VerifyStatus.REJECTED
METHOD_BN = {"bkash": "bKash", "nagad": "Nagad", "cash": "নগদ"}


class DuesOverview(APIView):
    """GET — setting, this month's defaulters, pending verifications, member × month grid."""

    permission_classes = [IsCashier]

    def get(self, request):
        today = timezone.localdate()
        year = int(request.query_params.get("year", today.year))
        setting = DuesSetting.objects.first()
        members = Member.objects.filter(status=Member.Status.ACTIVE).select_related("user").order_by("member_no")
        grid, defaulters = [], 0
        for m in members:
            months = dues_months(m, year)
            if any(x["month"] == today.month and x["status"] == "due" for x in months) and year == today.year:
                defaulters += 1
            grid.append({"member_id": m.id, "name": m.name, "member_no": m.member_no, "months": [x["status"] for x in months]})

        pending = []
        batches = DuesPayment.objects.filter(status=P).values("batch").annotate(n=Count("id")).order_by()
        for b in batches:
            rows = list(DuesPayment.objects.filter(batch=b["batch"], status=P).select_related("member").order_by("month"))
            if not rows:
                continue
            r0 = rows[0]
            pending.append({
                "kind": "dues", "id": r0.batch or str(r0.id), "name": r0.member.name, "amount": sum(r.amount for r in rows),
                "months": [r.month for r in rows], "year": r0.year, "method": METHOD_BN[r0.method], "trx_id": r0.trx_id, "created_at": r0.created_at,
            })
        for d in Donation.objects.filter(status=P).select_related("event", "aid_request"):
            target = d.event.title if d.event else ("সাহায্যের আবেদন" if d.aid_request else "সাধারণ তহবিল")
            pending.append({"kind": "donation", "id": str(d.id), "name": f"{d.public_name} (দান)", "amount": d.amount, "target": target, "method": METHOD_BN[d.method], "trx_id": d.trx_id, "created_at": d.created_at})
        pending.sort(key=lambda x: x["created_at"], reverse=True)
        return Response({
            "monthly_amount": DuesSetting.current_amount(),
            "effective_from": setting.effective_from if setting else None,
            "year": year,
            "defaulters": defaulters,
            "pending": pending,
            "grid": grid,
        })


class DuesSettingView(APIView):
    permission_classes = [IsCashier]

    def post(self, request):
        try:
            amount = int(str(request.data.get("monthly_amount")))
        except (TypeError, ValueError):
            amount = 0
        if amount <= 0:
            raise ValidationError({"monthly_amount": "টাকার পরিমাণ লিখুন"})
        eff = request.data.get("effective_from") or date(timezone.localdate().year, timezone.localdate().month, 1).isoformat()
        s = DuesSetting.objects.create(monthly_amount=amount, effective_from=eff)
        audit(request.user, "create", s, summary=f"মাসিক চাঁদা ৳{amount} ({eff} থেকে)")
        return Response({"monthly_amount": s.monthly_amount, "effective_from": s.effective_from})


class VerifyPayment(APIView):
    """POST {kind: dues|donation, id, ok: bool} — 'মিলেছে' / 'মেলেনি'."""

    permission_classes = [IsCashier]

    def post(self, request):
        kind, pk, ok = request.data.get("kind"), str(request.data.get("id")), bool(request.data.get("ok"))
        status = V if ok else R
        now = timezone.now()
        if kind == "dues":
            rows = DuesPayment.objects.filter(Q(batch=pk) | Q(pk=pk if pk.isdigit() else 0), status=P).select_related("member__user")
            if not rows:
                raise ValidationError({"detail": "পেমেন্ট পাওয়া যায়নি বা আগেই যাচাই হয়েছে"})
            m = rows[0].member
            months, total = sorted(r.month for r in rows), sum(r.amount for r in rows)
            rows.update(status=status, verified_by=request.user, verified_at=now)
            msg = (f"সগুনা আদর্শ যুব সমাজ: আপনার ৳{total} চাঁদা ({len(months)} মাস) পাওয়া গেছে। ধন্যবাদ।" if ok
                   else "সগুনা আদর্শ যুব সমাজ: আপনার চাঁদার Transaction ID মেলেনি। সাইটে আবার জমা দিন বা কোষাধ্যক্ষকে ফোন করুন।")
            send_sms(m.user.phone, msg)
            audit(request.user, "verify" if ok else "reject", None, model="finance.DuesPayment", object_id=pk, summary=f"চাঁদা {'যাচাই' if ok else 'মেলেনি'}: {m.name} ৳{total}")
        elif kind == "donation":
            d = get_object_or_404(Donation, pk=pk, status=P)
            d.status, d.verified_by, d.verified_at = status, request.user, now
            d.save()
            if d.phone:
                send_sms(d.phone, f"সগুনা আদর্শ যুব সমাজ: আপনার ৳{d.amount} দান পাওয়া গেছে। জাযাকাল্লাহ খাইরান।" if ok else "সগুনা আদর্শ যুব সমাজ: আপনার দানের Transaction ID মেলেনি। কোষাধ্যক্ষের সাথে যোগাযোগ করুন।")
            audit(request.user, "verify" if ok else "reject", d, summary=f"দান {'যাচাই' if ok else 'মেলেনি'}: ৳{d.amount}")
        else:
            raise ValidationError({"kind": "dues বা donation"})
        return Response({"status": status})


class CashDues(APIView):
    """POST {member_id, year, months[]} — cashier records cash received (verified immediately)."""

    permission_classes = [IsCashier]

    def post(self, request):
        m = get_object_or_404(Member, pk=request.data.get("member_id"), status=Member.Status.ACTIVE)
        year = int(request.data.get("year") or timezone.localdate().year)
        months = sorted({int(x) for x in request.data.get("months", [])})
        state = {x["month"]: x["status"] for x in dues_months(m, year)}
        months = [x for x in months if state.get(x) in ("due", "future")]
        if not months:
            raise ValidationError({"months": "বাকি মাস বাছাই করুন"})
        amount, batch, now = DuesSetting.current_amount(), secrets.token_hex(8), timezone.now()
        DuesPayment.objects.bulk_create([DuesPayment(member=m, year=year, month=x, amount=amount, method="cash", batch=batch, status=V, verified_by=request.user, verified_at=now) for x in months])
        audit(request.user, "create", None, model="finance.DuesPayment", object_id=batch, summary=f"নগদ চাঁদা: {m.name} {len(months)} মাস ৳{amount * len(months)}")
        return Response({"created": len(months)}, status=201)


class DuesReminder(APIView):
    permission_classes = [IsCashier]

    def post(self, request):
        today = timezone.localdate()
        phones = [m.user.phone for m in Member.objects.filter(status=Member.Status.ACTIVE).select_related("user")
                  if any(x["month"] == today.month and x["status"] == "due" for x in dues_months(m, today.year))]
        amount = DuesSetting.current_amount()
        sent = send_bulk(phones, f"সগুনা আদর্শ যুব সমাজ: এ মাসের চাঁদা ৳{amount} বাকি আছে। সাইটে লগইন করে bKash/Nagad-এ দিন।")
        audit(request.user, "remind", None, model="finance.DuesPayment", summary=f"{sent} জনকে চাঁদার SMS রিমাইন্ডার")
        return Response({"sent": sent})


def entry_dict(e) -> dict:
    is_exp = isinstance(e, Expense)
    return {
        "id": f"{'e' if is_exp else 'i'}{e.id}",
        "kind": "expense" if is_exp else "income",
        "category": e.category.name if e.category else "",
        "amount": e.amount,
        "date": e.date,
        "description": e.description,
        "event": e.event.title if e.event else None,
        "aid_request": e.aid_request_id,
        "voucher": media_url(e.voucher_image) if is_exp else None,
        "created_by": getattr(getattr(e.created_by, "member", None), "name", None),
        "is_void": e.is_void,
        "void_reason": e.void_reason,
    }


def get_entry(eid: str):
    model = {"e": Expense, "i": Income}.get(eid[:1])
    if not model or not eid[1:].isdigit():
        raise ValidationError({"detail": "এন্ট্রি পাওয়া যায়নি"})
    return get_object_or_404(model, pk=int(eid[1:]))


class EntriesView(APIView):
    """GET recent entries · POST new income/expense (multipart; expense needs voucher_image)."""

    permission_classes = [IsCashier]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        rel = ("category", "event", "created_by__member")
        rows = [*Income.objects.select_related(*rel)[:50], *Expense.objects.select_related(*rel)[:50]]
        rows.sort(key=lambda e: (e.date, e.created_at), reverse=True)
        return Response([entry_dict(e) for e in rows[:60]])

    def post(self, request):
        from apps.community.models import AidRequest
        from apps.content.models import Event

        d = request.data
        kind = d.get("kind")
        if kind not in ("income", "expense"):
            raise ValidationError({"kind": "আয় না ব্যয়?"})
        try:
            amount = int(str(d.get("amount", "0")))
        except ValueError:
            amount = 0
        errors = {}
        if amount <= 0:
            errors["amount"] = "টাকার পরিমাণ লিখুন"
        if not d.get("date"):
            errors["date"] = "তারিখ দিন"
        voucher = request.FILES.get("voucher_image")
        if kind == "expense" and not voucher:
            errors["voucher_image"] = "খরচের জন্য ভাউচারের ছবি বাধ্যতামূলক"
        if errors:
            raise ValidationError(errors)
        cat = ListItem.objects.filter(kind="expenseCat" if kind == "expense" else "incomeCat", name=d.get("category")).first()
        model = Expense if kind == "expense" else Income
        e = model(category=cat, amount=amount, date=d["date"], description=str(d.get("description", ""))[:200], created_by=request.user)
        if ev := d.get("event"):
            e.event = Event.objects.filter(slug=ev).first()
        if (aid := str(d.get("aid_request", ""))).removeprefix("aid-").isdigit():
            e.aid_request = AidRequest.objects.filter(pk=int(aid.removeprefix("aid-"))).first()
        if voucher:
            check_upload(voucher, field="voucher_image")
            e.voucher_image.save("voucher.webp", to_webp(voucher, 1600), save=False)
        e.save()
        audit(request.user, "create", e, summary=f"{'ব্যয়' if kind == 'expense' else 'আয়'} এন্ট্রি ৳{amount} ({cat.name if cat else ''})")
        return Response(entry_dict(e), status=201)


class EntryDetailView(APIView):
    """GET one entry · PATCH description/amount/date/category · POST /void/ with mandatory reason. Financial entries are never deleted."""

    permission_classes = [IsCashier]

    def get(self, request, eid):
        return Response(entry_dict(get_entry(eid)))

    def patch(self, request, eid):
        e = get_entry(eid)
        if e.is_void:
            raise ValidationError({"detail": "বাতিল এন্ট্রি এডিট করা যায় না"})
        before = snapshot(e)
        for f in ("description", "amount", "date"):
            if f in request.data:
                setattr(e, f, request.data[f])
        if "category" in request.data:
            e.category = ListItem.objects.filter(kind="expenseCat" if isinstance(e, Expense) else "incomeCat", name=request.data["category"]).first() or e.category
        e.save()
        audit(request.user, "update", e, before=before, summary=f"এন্ট্রি এডিট: {e.description}")
        return Response(entry_dict(e))

    def post(self, request, eid):
        if not request.path.rstrip("/").endswith("/void"):
            raise ValidationError({"detail": "বাতিল করতে /void/ ব্যবহার করুন"})
        e = get_entry(eid)
        reason = str(request.data.get("reason", "")).strip()
        if not reason:
            raise ValidationError({"reason": "বাতিলের কারণ লিখুন"})
        if e.is_void:
            raise ValidationError({"detail": "আগেই বাতিল"})
        before = snapshot(e)
        e.is_void, e.void_reason = True, reason[:200]
        e.save()
        audit(request.user, "void", e, before=before, summary=f"এন্ট্রি বাতিল: {reason}")
        return Response(entry_dict(e))


class ReportsView(APIView):
    """GET stats for the reports page."""

    permission_classes = [IsCashier]

    def get(self, request):
        active = Member.objects.filter(status=Member.Status.ACTIVE)
        by_para = [{"name": p.name, "count": active.filter(para=p).count()} for p in ListItem.objects.filter(kind="para")]
        by_blood = [{"name": g, "count": active.filter(blood_group=g).count()} for g, _ in BLOOD_GROUPS]
        return Response({
            "by_para": by_para,
            "by_blood": by_blood,
            "abroad": active.filter(residence=Member.Residence.ABROAD).count(),
            "dhaka": active.filter(residence=Member.Residence.DHAKA).count(),
            "totals": services.totals(),
        })


class ReportDownload(APIView):
    """GET /admin/reports/<kind>.csv?year=&month= — finance (monthly/yearly) or dues collection."""

    permission_classes = [IsCashier]

    def get(self, request, kind):
        year = int(request.query_params.get("year", timezone.localdate().year))
        month = request.query_params.get("month")
        buf = io.StringIO()
        w = csv.writer(buf)
        if kind == "finance":
            start = date(year, int(month), 1) if month else date(year, 1, 1)
            end = (date(year + (int(month) == 12), int(month) % 12 + 1, 1) if month else date(year + 1, 1, 1))
            w.writerow(["তারিখ", "ধরন", "খাত / উৎস", "বিবরণ", "টাকা", "অবস্থা"])
            for p in DuesPayment.objects.filter(status=V, created_at__date__gte=start, created_at__date__lt=end).select_related("member"):
                w.writerow([p.created_at.date(), "আয়", "মাসিক চাঁদা", f"{p.member.name} ({p.month}/{p.year})", p.amount, "যাচাইকৃত"])
            for d in Donation.objects.filter(status=V, created_at__date__gte=start, created_at__date__lt=end):
                w.writerow([d.created_at.date(), "আয়", "দান", d.public_name, d.amount, "যাচাইকৃত"])
            for model, label in ((Income, "আয়"), (Expense, "ব্যয়")):
                for e in model.objects.filter(date__gte=start, date__lt=end).select_related("category"):
                    w.writerow([e.date, label, e.category.name if e.category else "", e.description, e.amount, f"বাতিল: {e.void_reason}" if e.is_void else "বৈধ"])
            t = services.totals(start, end)
            w.writerow([])
            w.writerow(["মোট আয়", t["income"], "মোট ব্যয়", t["expense"], "ব্যালেন্স", t["balance"]])
            name = f"finance-{year}{'-' + month if month else ''}.csv"
        elif kind == "dues":
            m = int(month or timezone.localdate().month)
            w.writerow(["নম্বর", "নাম", "ফোন", f"{m}/{year}"])
            for mem in Member.objects.filter(status=Member.Status.ACTIVE).select_related("user"):
                st = dues_months(mem, year)[m - 1]["status"]
                w.writerow([mem.member_no, mem.name, mem.user.phone, {"paid": "পরিশোধিত", "pending": "যাচাই বাকি", "due": "বাকি"}.get(st, st)])
            name = f"dues-{year}-{m}.csv"
        else:
            raise ValidationError({"detail": "অজানা রিপোর্ট"})
        audit(request.user, "export", None, model="finance.Report", summary=f"রিপোর্ট ডাউনলোড: {name}")
        resp = HttpResponse("﻿" + buf.getvalue(), content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="{name}"'
        return resp
