import secrets
from datetime import date

from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.permissions import IsActiveMember, active_member
from apps.core.utils import audit, require_phone

from . import services
from .models import METHODS, Donation, DuesPayment, DuesSetting, VerifyStatus


def clean_trx(raw) -> str:
    trx = str(raw or "").strip().upper().replace(" ", "")
    if not (8 <= len(trx) <= 20) or not trx.isalnum():
        raise ValidationError({"trx_id": "মেসেজে আসা Transaction ID লিখুন (৮–১০ অক্ষর)"})
    return trx


class FinanceSummaryView(APIView):
    """GET /finance/summary/ — public totals, 6-month chart, expense-by-category."""

    permission_classes = [AllowAny]

    def get(self, request):
        today = date.today()
        return Response(
            {
                **services.totals(),
                "period": {"from": date(today.year, 1, 1), "to": today},
                "months": services.monthly(6),
                "expense_by_category": services.expense_by_category(),
            }
        )


class TransactionsView(APIView):
    """GET /finance/transactions/ — members only (with voucher links)."""

    permission_classes = [IsActiveMember]

    def get(self, request):
        return Response(services.recent_transactions(int(request.query_params.get("limit", 12))))


class DonationCreateView(APIView):
    """POST /donations/ — public; stays 'pending' until the cashier matches the TrxID."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_form"

    def post(self, request):
        from apps.community.models import AidRequest
        from apps.content.models import Event

        d = request.data
        try:
            amount = int(str(d.get("amount", "0")))
        except ValueError:
            amount = 0
        if amount <= 0:
            raise ValidationError({"amount": "টাকার পরিমাণ লিখুন"})
        method = d.get("method", "bkash")
        if method not in dict(METHODS) or method == "cash":
            raise ValidationError({"method": "bKash বা Nagad বাছাই করুন"})
        donation = Donation(
            donor_name=str(d.get("name", ""))[:120],
            phone=require_phone(d.get("phone")),
            is_anonymous=bool(d.get("anonymous")),
            amount=amount,
            method=method,
            trx_id=clean_trx(d.get("trx_id")),
        )
        purpose = str(d.get("purpose") or "general")
        if purpose != "general":
            if ev := Event.objects.filter(slug=purpose).first():
                donation.purpose, donation.event = Donation.Purpose.EVENT, ev
            elif purpose.startswith("aid-") and purpose[4:].isdigit():
                aid = AidRequest.objects.filter(pk=int(purpose[4:]), status=AidRequest.Status.APPROVED).first()
                if aid:
                    donation.purpose, donation.aid_request = Donation.Purpose.AID, aid
        if Donation.objects.filter(trx_id=donation.trx_id).exclude(status=VerifyStatus.REJECTED).exists():
            raise ValidationError({"trx_id": "এই Transaction ID আগেই জমা হয়েছে"})
        donation.save()
        audit(None, "create", donation, summary=f"দান জমা ৳{amount} ({donation.public_name})")
        return Response({"status": "pending", "id": donation.id}, status=201)


def dues_months(member, year: int):
    """Per-month status for a member: paid / pending / due / future (rejected counts as due)."""
    today = timezone.localdate()
    pays = DuesPayment.objects.filter(member=member, year=year).exclude(status=VerifyStatus.REJECTED)
    by_month = {}
    for p in pays:
        if by_month.get(p.month) != "paid":
            by_month[p.month] = "paid" if p.status == VerifyStatus.VERIFIED else "pending"
    rejected = set(DuesPayment.objects.filter(member=member, year=year, status=VerifyStatus.REJECTED).values_list("month", flat=True))
    joined = member.joined_at
    out = []
    for m in range(1, 13):
        if m in by_month:
            st = by_month[m]
        elif (year, m) > (today.year, today.month):
            st = "future"
        elif (year, m) < (joined.year, joined.month):
            st = "na"
        else:
            st = "due"
        out.append({"month": m, "status": st, "rejected": m in rejected and st == "due"})
    return out


class MyDuesView(APIView):
    """GET /dues/me/?year=2026 and POST /dues/ {year, months[], method, trx_id}."""

    permission_classes = [IsActiveMember]

    def get(self, request):
        member = active_member(request.user)
        year = int(request.query_params.get("year", timezone.localdate().year))
        history = []
        seen = {}
        for p in DuesPayment.objects.filter(member=member).select_related("verified_by__member").order_by("-created_at"):
            key = p.batch or f"p{p.id}"
            if key not in seen:
                seen[key] = {
                    "id": key,
                    "months": [],
                    "year": p.year,
                    "method": p.method,
                    "amount": 0,
                    "status": p.status,
                    "trx_id": p.trx_id,
                    "created_at": p.created_at,
                    "verified_by": getattr(getattr(p.verified_by, "member", None), "name", None),
                }
                history.append(seen[key])
            seen[key]["months"].append(p.month)
            seen[key]["amount"] += p.amount
        for h in history:
            h["months"].sort()
        return Response({"year": year, "monthly_amount": DuesSetting.current_amount(), "months": dues_months(member, year), "history": history[:20]})

    def post(self, request):
        member = active_member(request.user)
        d = request.data
        year = int(d.get("year") or timezone.localdate().year)
        months = sorted({int(m) for m in d.get("months", []) if 1 <= int(m) <= 12})
        if not months:
            raise ValidationError({"months": "মাস বাছাই করুন"})
        state = {x["month"]: x["status"] for x in dues_months(member, year)}
        bad = [m for m in months if state.get(m) not in ("due", "future")]
        if bad:
            raise ValidationError({"months": "কিছু মাস আগেই পরিশোধিত বা যাচাইয়ের অপেক্ষায়"})
        method = d.get("method")
        if method not in dict(METHODS):
            raise ValidationError({"method": "কীভাবে দেবেন বাছাই করুন"})
        trx = clean_trx(d.get("trx_id")) if method != "cash" else ""
        amount = DuesSetting.current_amount()
        batch = secrets.token_hex(8)
        rows = [DuesPayment(member=member, year=year, month=m, amount=amount, method=method, trx_id=trx, batch=batch) for m in months]
        DuesPayment.objects.bulk_create(rows)
        audit(request.user, "create", None, model="finance.DuesPayment", object_id=batch, summary=f"চাঁদা জমা {len(months)} মাস · ৳{amount * len(months)}", after={"months": months, "method": method, "trx_id": trx})
        return Response({"status": "pending", "total": amount * len(months)}, status=201)

