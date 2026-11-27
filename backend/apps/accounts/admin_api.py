import csv
import io

from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import AuditLog, ListItem
from apps.core.permissions import IsCommittee, RoleRequired, has_role
from apps.core.sms import send_sms
from apps.core.utils import audit, normalise_phone, require_phone
from apps.core.viewsets import AuditedModelViewSet

from .models import Member, Role, User

ROLE_BN = {Role.MEMBER: "সদস্য", Role.VOLUNTEER: "স্বেচ্ছাসেবক", Role.CASHIER: "ক্যাশিয়ার", Role.ADMIN: "অ্যাডমিন"}


class AdminMemberSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(source="user.phone")
    role = serializers.ChoiceField(source="user.role", choices=Role.choices, required=False)
    para = serializers.CharField(source="para.name", read_only=True, default="")
    para_id = serializers.PrimaryKeyRelatedField(source="para", queryset=ListItem.objects.filter(kind="para"), allow_null=True, required=False)
    residence_label = serializers.CharField(source="get_residence_display", read_only=True)

    class Meta:
        model = Member
        fields = ["id", "member_no", "name", "father_name", "phone", "role", "para", "para_id", "profession", "blood_group", "residence", "residence_label", "country", "status", "joined_at"]
        read_only_fields = ["member_no"]

    def validate_phone(self, v):
        p = require_phone(v)
        qs = User.objects.filter(phone=p)
        if self.instance:
            qs = qs.exclude(pk=self.instance.user_id)
        if qs.exists():
            raise ValidationError("এই নম্বরে আগেই একজন সদস্য আছেন")
        return p

    def create(self, data):
        u = data.pop("user")
        user = User.objects.create_user(phone=u["phone"], role=u.get("role", Role.MEMBER))
        data.setdefault("status", Member.Status.ACTIVE)
        return Member.objects.create(user=user, **data)

    def update(self, m, data):
        u = data.pop("user", {})
        if "phone" in u:
            m.user.phone = u["phone"]
        if "role" in u:
            m.user.role = u["role"]
        m.user.save()
        return super().update(m, data)


class AdminMemberViewSet(AuditedModelViewSet):
    """Admins: full control. Volunteers: add / edit basic info, approve applications (no roles, no delete)."""

    serializer_class = AdminMemberSerializer
    permission_classes = [RoleRequired(Role.VOLUNTEER)]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        qs = Member.objects.select_related("user", "para")
        p = self.request.query_params
        if s := p.get("status"):
            qs = qs.filter(status=s)
        else:
            qs = qs.exclude(status__in=[Member.Status.PENDING, Member.Status.REJECTED])
        if q := p.get("q"):
            qs = qs.filter(name__icontains=q) | qs.filter(member_no__icontains=q.upper()) | qs.filter(user__phone__contains=q)
        if v := p.get("para"):
            qs = qs.filter(para__name=v)
        return qs.order_by("member_no", "id")

    def perform_update(self, serializer):
        if not has_role(self.request.user, Role.ADMIN) and "role" in self.request.data:
            raise PermissionDenied("রোল বদলাতে পারেন শুধু অ্যাডমিন")
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        if not has_role(self.request.user, Role.ADMIN):
            raise PermissionDenied("মুছতে পারেন শুধু অ্যাডমিন")
        user = instance.user
        super().perform_destroy(instance)
        user.delete()

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        m = get_object_or_404(Member, pk=pk)
        if m.status != Member.Status.PENDING:
            raise ValidationError({"detail": "এই আবেদন আগেই নিষ্পত্তি হয়েছে"})
        m.status = Member.Status.ACTIVE
        m.save()
        send_sms(m.user.phone, f"অভিনন্দন! আপনি সগুনা আদর্শ যুব সমাজের সদস্য। সদস্য নম্বর {m.member_no}। ফোন নম্বর দিয়ে লগইন করুন।")
        audit(request.user, "approve", m, summary=f"আবেদন অনুমোদন: {m.name}")
        return Response(AdminMemberSerializer(m).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        m = get_object_or_404(Member, pk=pk)
        if m.status != Member.Status.PENDING:
            raise ValidationError({"detail": "এই আবেদন আগেই নিষ্পত্তি হয়েছে"})
        m.status = Member.Status.REJECTED
        m.save()
        audit(request.user, "reject", m, summary=f"আবেদন বাতিল: {m.name}")
        return Response(AdminMemberSerializer(m).data)

    @action(detail=False, methods=["get"])
    def export(self, request):
        if not has_role(request.user, Role.ADMIN):
            raise PermissionDenied("এক্সপোর্ট করতে পারেন শুধু অ্যাডমিন")
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["নম্বর", "নাম", "বাবার নাম", "ফোন", "পাড়া", "পেশা", "রক্ত", "বর্তমানে থাকেন", "দেশ", "রোল", "অবস্থা", "যোগদান"])
        for m in Member.objects.exclude(status=Member.Status.REJECTED).select_related("user", "para"):
            w.writerow([m.member_no, m.name, m.father_name, m.user.phone, m.para.name if m.para else "", m.profession, m.blood_group, m.get_residence_display(), m.country, ROLE_BN.get(m.user.role, ""), m.get_status_display(), m.joined_at])
        audit(request.user, "export", None, model="accounts.Member", summary="সদস্য তালিকা এক্সপোর্ট")
        resp = HttpResponse("﻿" + buf.getvalue(), content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="members-{timezone.localdate()}.csv"'
        return resp

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    def import_csv(self, request):
        """CSV columns: নাম, ফোন, পাড়া, পেশা, রক্ত (header row required). Creates active members; skips duplicates."""
        if not has_role(request.user, Role.ADMIN):
            raise PermissionDenied("ইমপোর্ট করতে পারেন শুধু অ্যাডমিন")
        f = request.FILES.get("file")
        if not f:
            raise ValidationError({"file": "CSV ফাইল দিন"})
        rows = csv.DictReader(io.StringIO(f.read().decode("utf-8-sig")))
        created, skipped, errors = 0, 0, []
        paras = {p.name: p for p in ListItem.objects.filter(kind="para")}
        with transaction.atomic():
            for i, r in enumerate(rows, start=2):
                phone = normalise_phone(r.get("ফোন") or r.get("phone"))
                name = (r.get("নাম") or r.get("name") or "").strip()
                if not (phone and name):
                    errors.append(f"লাইন {i}: নাম/ফোন ঠিক নেই")
                    continue
                if User.objects.filter(phone=phone).exists():
                    skipped += 1
                    continue
                user = User.objects.create_user(phone=phone)
                Member.objects.create(
                    user=user, name=name, status=Member.Status.ACTIVE,
                    para=paras.get((r.get("পাড়া") or "").strip()), profession=(r.get("পেশা") or "").strip(), blood_group=(r.get("রক্ত") or "").strip(),
                )
                created += 1
        audit(request.user, "import", None, model="accounts.Member", summary=f"CSV ইমপোর্ট: {created} জন যোগ, {skipped} জন আগে থেকেই ছিলেন")
        return Response({"created": created, "skipped": skipped, "errors": errors[:20]})


class DashboardView(APIView):
    permission_classes = [IsCommittee]

    def get(self, request):
        from apps.finance.models import Donation, DuesPayment, DuesSetting, VerifyStatus
        from apps.finance.services import totals

        today = timezone.localdate()
        active = Member.objects.filter(status=Member.Status.ACTIVE)
        paid_ids = set(DuesPayment.objects.filter(year=today.year, month=today.month, status=VerifyStatus.VERIFIED).values_list("member_id", flat=True))
        collected = sum(DuesPayment.objects.filter(year=today.year, month=today.month, status=VerifyStatus.VERIFIED).values_list("amount", flat=True))
        n_active = active.count()
        pending_verify = DuesPayment.objects.filter(status=VerifyStatus.PENDING).values("batch").distinct().count() + Donation.objects.filter(status=VerifyStatus.PENDING).count()
        activity = [
            {"id": a.id, "text": a.summary or f"{a.action} {a.model}", "user": getattr(getattr(a.user, "member", None), "name", None), "action": a.action, "timestamp": a.timestamp}
            for a in AuditLog.objects.select_related("user__member")[:12]
        ]
        return Response(
            {
                "members": n_active,
                "new_this_month": active.filter(joined_at__year=today.year, joined_at__month=today.month).count(),
                "pending_members": Member.objects.filter(status=Member.Status.PENDING).count(),
                "dues_collected": collected,
                "dues_paid_members": len(paid_ids),
                "dues_due_members": max(n_active - len(paid_ids), 0),
                "dues_pct": round(len(paid_ids) / n_active * 100) if n_active else 0,
                "monthly_dues": DuesSetting.current_amount(),
                "balance": totals()["balance"],
                "pending_verify": pending_verify,
                "activity": activity,
            }
        )

