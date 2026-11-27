from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.models import BLOOD_GROUPS, Member
from apps.core.models import CommitteePosition
from apps.core.permissions import IsActiveMember, active_member
from apps.core.sms import send_bulk
from apps.core.utils import audit, check_upload, media_url, require_phone

from .models import AidDocument, AidRequest, BloodRequest, ContactMessage, JobPost, ServiceProvider


def _required(data, field, msg):
    v = str(data.get(field, "")).strip()
    if not v:
        raise ValidationError({field: msg})
    return v


class BloodRequestCreate(APIView):
    """POST — no approval needed. SMS goes to ready donors of the group + the blood secretary."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_form"

    def post(self, request):
        d = request.data
        group = str(d.get("blood_group", "")).replace(" ", "+")
        if group not in dict(BLOOD_GROUPS):
            raise ValidationError({"blood_group": "রক্তের গ্রুপ বাছাই করুন"})
        try:
            bags = int(str(d.get("bags", "0")))
        except ValueError:
            bags = 0
        if bags <= 0:
            raise ValidationError({"bags": "কত ব্যাগ লাগবে লিখুন"})
        req = BloodRequest.objects.create(
            patient_name=_required(d, "patient", "রোগীর নাম লিখুন"),
            blood_group=group,
            bags=bags,
            hospital=_required(d, "hospital", "হাসপাতালের নাম লিখুন"),
            phone=require_phone(d.get("phone")),
        )
        donors = [m for m in Member.objects.filter(status=Member.Status.ACTIVE, blood_group=group, wants_to_donate=True).select_related("user") if m.donor_ready]
        secretaries = CommitteePosition.objects.filter(term__is_current=True, title__contains="রক্তদান").select_related("member__user")
        phones = {m.user.phone for m in donors} | {p.member.user.phone for p in secretaries if p.member}
        msg = f"জরুরি রক্ত: {group} {bags} ব্যাগ — {req.hospital}। রোগী: {req.patient_name}। ফোন: {req.phone}"
        req.notified_donors = send_bulk(sorted(phones), msg)
        req.save(update_fields=["notified_donors"])
        audit(None, "create", req, summary=f"রক্তের অনুরোধ {group} — {req.notified_donors} জনকে SMS")
        return Response({"status": "sent", "notified": req.notified_donors}, status=201)


class ContactCreate(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_form"

    def post(self, request):
        d = request.data
        msg = ContactMessage.objects.create(
            name=_required(d, "name", "নাম লিখুন"),
            phone=require_phone(d.get("phone")),
            subject=str(d.get("subject", ""))[:160],
            message=_required(d, "message", "বার্তা লিখুন"),
        )
        audit(None, "create", msg, summary=f"নতুন বার্তা: {msg.name}")
        return Response({"status": "received"}, status=201)


def fund_dict(a: AidRequest) -> dict:
    return {
        "id": f"aid-{a.id}",
        "type": a.get_type_display() + " সহায়তা" if a.type != AidRequest.Type.DISASTER else "দুর্যোগ",
        "title": a.public_title or f"{a.get_type_display()} সহায়তা",
        "description": a.public_description,
        "applicant_name": a.applicant.name if a.show_name_public and a.applicant else None,
        "raised": a.raised,
        "target": a.target_amount or a.amount_needed,
        "deadline": a.target_date,
        "image": media_url(a.image, a.image_url),
    }


class AidFundList(APIView):
    """Approved aid requests as public fund cards — no private details, name hidden unless allowed."""

    permission_classes = [AllowAny]

    def get(self, request):
        qs = AidRequest.objects.filter(status=AidRequest.Status.APPROVED).select_related("applicant")
        return Response([fund_dict(a) for a in qs])


class ServiceList(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = ServiceProvider.objects.filter(approved=True).select_related("category")
        return Response([{"id": s.id, "category": s.category.name if s.category else "অন্যান্য", "name": s.name, "para": s.para, "phone": s.phone} for s in qs])


class JobList(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = JobPost.objects.filter(is_published=True)
        return Response([{"id": j.id, "kind": j.get_kind_display(), "title": j.title, "description": j.description, "published_at": j.published_at} for j in qs])


class MyAidRequests(APIView):
    """GET mine / POST new application (multipart with documents)."""

    permission_classes = [IsActiveMember]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        m = active_member(request.user)
        return Response(
            [
                {"id": a.id, "type": a.get_type_display(), "title": a.beneficiary + " — " + a.description[:60], "description": a.description, "created_at": a.created_at, "status": a.status, "note": a.note or default_note(a)}
                for a in AidRequest.objects.filter(applicant=m)
            ]
        )

    def post(self, request):
        m = active_member(request.user)
        d = request.data
        t = d.get("type")
        if t not in dict(AidRequest.Type.choices):
            raise ValidationError({"type": "আবেদনের ধরন বাছাই করুন"})
        try:
            amount = int(str(d.get("amount", "0")))
        except ValueError:
            amount = 0
        if amount <= 0:
            raise ValidationError({"amount": "আনুমানিক টাকার পরিমাণ লিখুন"})
        files = request.FILES.getlist("documents")
        for f in files:
            check_upload(f, allowed=("image/", "application/pdf"), field="documents")
        a = AidRequest.objects.create(
            applicant=m,
            type=t,
            beneficiary=_required(d, "for_whom", "কার জন্য আবেদন, লিখুন"),
            description=_required(d, "description", "কী হয়েছে, সংক্ষেপে লিখুন"),
            amount_needed=amount,
            show_name_public=str(d.get("show_name", "")).lower() in {"1", "true", "on"},
        )
        for f in files:
            AidDocument.objects.create(aid_request=a, file=f, name=f.name[:160], size_kb=round(f.size / 1024))
        audit(request.user, "create", a, summary=f"সাহায্যের আবেদন: {a.beneficiary}")
        return Response({"id": a.id, "status": a.status}, status=201)


def default_note(a: AidRequest) -> str:
    return {
        AidRequest.Status.PENDING: "কমিটির যাচাই চলছে",
        AidRequest.Status.APPROVED: f"লক্ষ্য ৳{a.target_amount or a.amount_needed:,} · পাবলিক পাতায় তহবিল চলছে",
        AidRequest.Status.REJECTED: "কমিটি এবার অনুমোদন দিতে পারেনি",
        AidRequest.Status.DONE: "সহায়তা হস্তান্তর হয়েছে",
    }[a.status]


