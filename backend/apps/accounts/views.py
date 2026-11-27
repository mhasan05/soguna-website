import hashlib
import hmac
import secrets
from datetime import timedelta

from django.conf import settings
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.permissions import IsActiveMember, active_member
from apps.core.sms import send_sms
from apps.core.utils import audit, check_upload, require_phone, to_webp

from .models import BLOOD_GROUPS, Member, OTPCode, User
from .serializers import DirectoryMemberSerializer, MemberSelfSerializer, RegisterSerializer


class ApiError(APIException):
    """Non-field error with a machine-readable code and optional raw extras (e.g. attempts_left)."""

    def __init__(self, detail, code, status_code=400, **extra):
        self.status_code = status_code
        self.default_code = code
        self.extra = extra
        super().__init__(detail, code)


def _hash(phone: str, code: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), f"{phone}:{code}".encode(), hashlib.sha256).hexdigest()


def tokens_for(user) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


class SendOTPView(APIView):
    """POST {phone} — sends a 6-digit code. Valid 5 min; max 5 per number per hour."""

    permission_classes = [AllowAny]

    def post(self, request):
        phone = require_phone(request.data.get("phone"))
        hour_ago = timezone.now() - timedelta(hours=1)
        recent = OTPCode.objects.filter(phone=phone, created_at__gte=hour_ago)
        if recent.count() >= settings.OTP_MAX_PER_HOUR:
            first = recent.order_by("created_at").first()
            wait = int((first.created_at + timedelta(hours=1) - timezone.now()).total_seconds())
            raise ApiError("এক ঘণ্টায় ৫ বার কোড চাওয়া হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।", "otp_rate_limited", 429, retry_in=max(wait, 60))
        last = recent.first()
        if last and (timezone.now() - last.created_at).total_seconds() < settings.OTP_RESEND_SECONDS:
            raise ApiError("একটু পরে আবার কোড চান", "otp_too_soon", 429, retry_in=settings.OTP_RESEND_SECONDS)

        code = settings.OTP_DEV_CODE or f"{secrets.randbelow(10**6):06d}"
        OTPCode.objects.filter(phone=phone, used=False).update(used=True)
        OTPCode.objects.create(
            phone=phone,
            code_hash=_hash(phone, code),
            expires_at=timezone.now() + timedelta(seconds=settings.OTP_TTL_SECONDS),
            attempts_left=settings.OTP_MAX_ATTEMPTS,
        )
        send_sms(phone, f"সগুনা আদর্শ যুব সমাজ: আপনার লগইন কোড {code}। ৫ মিনিট কাজ করবে।")
        registered = Member.objects.filter(user__phone=phone).exists()
        data = {"expires_in": settings.OTP_TTL_SECONDS, "resend_in": settings.OTP_RESEND_SECONDS, "registered": registered}
        if settings.OTP_SHOW_ON_SCREEN:
            data["screen_code"] = code  # no SMS gateway yet — shown on the login screen
        return Response(data)


class VerifyOTPView(APIView):
    """POST {phone, code} → JWT pair + the member profile."""

    permission_classes = [AllowAny]

    def post(self, request):
        phone = require_phone(request.data.get("phone"))
        from apps.core.utils import ascii_digits

        code = ascii_digits(str(request.data.get("code", ""))).strip()
        otp = OTPCode.objects.filter(phone=phone, used=False).first()
        if not otp:
            raise ApiError("নতুন কোড নিন", "otp_missing")
        if otp.expires_at < timezone.now():
            raise ApiError("কোডের মেয়াদ শেষ। নতুন কোড নিন।", "otp_expired")
        if otp.attempts_left == 0:
            raise ApiError("অনেকবার ভুল কোড দেওয়া হয়েছে। নতুন কোড নিন।", "otp_invalid", attempts_left=0)
        if not hmac.compare_digest(otp.code_hash, _hash(phone, code)):
            otp.attempts_left -= 1
            otp.save(update_fields=["attempts_left"])
            raise ApiError("কোডটি মেলেনি", "otp_invalid", attempts_left=otp.attempts_left)
        otp.used = True
        otp.save(update_fields=["used"])

        user = User.objects.filter(phone=phone).first()
        member = getattr(user, "member", None) if user else None
        if not member:
            raise ApiError("এই নম্বরে কোনো সদস্য নেই। আগে সদস্য হওয়ার আবেদন করুন।", "not_registered", 404)
        if member.status == Member.Status.PENDING:
            raise ApiError("আপনার আবেদন কমিটির যাচাইয়ের অপেক্ষায় আছে।", "pending", 403)
        if member.status != Member.Status.ACTIVE or not user.is_active:
            raise ApiError("আপনার সদস্যপদ এখন সক্রিয় নয়। কমিটির সাথে যোগাযোগ করুন।", "inactive", 403)
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        return Response({**tokens_for(user), "member": MemberSelfSerializer(member, context={"request": request}).data})


class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_form"

    def perform_create(self, serializer):
        member = serializer.save()
        audit(None, "register", member, summary=f"নতুন আবেদন: {member.name}")

    def create(self, request, *args, **kwargs):
        super().create(request, *args, **kwargs)
        return Response({"status": "pending"}, status=status.HTTP_201_CREATED)


def me_member(request) -> Member:
    m = getattr(request.user, "member", None)
    if not m:
        raise ApiError("সদস্য প্রোফাইল পাওয়া যায়নি", "no_member", 404)
    return m


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MemberSelfSerializer

    def get_object(self):
        return me_member(self.request)

    def perform_update(self, serializer):
        before = MemberSelfSerializer(serializer.instance, context={"request": self.request}).data
        m = serializer.save()
        audit(self.request.user, "update", m, before=dict(before), summary="নিজের প্রোফাইল হালনাগাদ")


class MePhotoView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        m = me_member(request)
        f = request.FILES.get("photo")
        if not f:
            raise ValidationError({"photo": "ছবি দিন"})
        check_upload(f, field="photo")
        m.photo.save("x.webp", to_webp(f, 600))
        return Response(MemberSelfSerializer(m, context={"request": request}).data)


class DonorAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        m = me_member(request)
        m.available = bool(request.data.get("available"))
        m.save(update_fields=["available"])
        return Response(MemberSelfSerializer(m, context={"request": request}).data)


class DonatedTodayView(APIView):
    """'আজ রক্ত দিয়েছি' — sets last_donation_date = today (auto-unavailable for 90 days)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        m = me_member(request)
        undo = bool(request.data.get("undo"))
        if undo:
            m.last_donation_date = request.data.get("previous") or None
        else:
            m.last_donation_date = timezone.localdate()
            m.wants_to_donate = True
        m.save(update_fields=["last_donation_date", "wants_to_donate"])
        audit(request.user, "donated" if not undo else "undo_donated", m, summary="রক্তদানের তারিখ হালনাগাদ")
        return Response(MemberSelfSerializer(m, context={"request": request}).data)


class DirectoryView(generics.ListAPIView):
    """GET /members/?q=&para=&profession=&blood_group=&residence= — members only."""

    permission_classes = [IsActiveMember]
    serializer_class = DirectoryMemberSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Member.objects.filter(status=Member.Status.ACTIVE).select_related("user", "para")
        p = self.request.query_params
        if q := p.get("q", "").strip():
            from apps.core.utils import ascii_digits

            digits = ascii_digits(q)
            cond = Q(name__icontains=q) | Q(member_no__icontains=q)
            if digits.isdigit() and len(digits) >= 3:
                cond |= Q(user__phone__contains=digits, show_phone=True)
            qs = qs.filter(cond)
        if v := p.get("para"):
            qs = qs.filter(para__name=v)
        if v := p.get("profession"):
            qs = qs.filter(profession=v)
        if v := p.get("blood_group"):
            qs = qs.filter(blood_group=v)
        if v := p.get("residence"):
            qs = qs.filter(residence=v)
        return qs

    def list(self, request, *args, **kwargs):
        resp = super().list(request, *args, **kwargs)
        resp.data = {"results": resp.data, "total": Member.objects.filter(status=Member.Status.ACTIVE).count()}
        return resp


class VerifyMemberView(APIView):
    """Public QR verification page data — only name and status, nothing private."""

    permission_classes = [AllowAny]

    def get(self, request, member_no):
        m = Member.objects.filter(member_no=member_no.upper()).first()
        if not m:
            return Response({"valid": False, "member_no": member_no}, status=404)
        return Response({"valid": m.status == Member.Status.ACTIVE, "member_no": m.member_no, "name": m.name, "status": m.status, "since": m.joined_at.year})


class DonorsView(APIView):
    """
    GET /donors/?blood_group=B+&para=  — visitors get counts only; members also get the list.
    'Ready' (প্রস্তুত) = last donation ≥ 90 days ago, computed here.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        group = request.query_params.get("blood_group", "").replace(" ", "+")
        if group not in dict(BLOOD_GROUPS):
            raise ValidationError({"blood_group": "রক্তের গ্রুপ বাছাই করুন"})
        qs = Member.objects.filter(status=Member.Status.ACTIVE, wants_to_donate=True, blood_group=group).select_related("user", "para")
        if para := request.query_params.get("para"):
            qs = qs.filter(para__name=para)
        donors = list(qs)
        ready = [d for d in donors if d.donor_ready]
        body = {"blood_group": group, "total": len(donors), "ready": len(ready), "donors": None}
        if active_member(request.user) or getattr(request.user, "is_committee", False):
            donors.sort(key=lambda d: (not d.donor_ready, d.name))
            body["donors"] = [
                {
                    "id": d.id,
                    "name": d.name,
                    "para": d.para.name if d.para else "",
                    "last_donation_date": d.last_donation_date,
                    "ready": d.donor_ready,
                    "phone": d.user.phone if d.show_phone else None,
                }
                for d in donors
            ]
        return Response(body)


def get_member_or_404(pk):
    return get_object_or_404(Member.objects.select_related("user", "para"), pk=pk)
