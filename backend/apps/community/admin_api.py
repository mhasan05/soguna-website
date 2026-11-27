from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.core.models import ListItem
from apps.core.permissions import IsAdmin
from apps.core.sms import send_sms
from apps.core.utils import audit, check_upload, media_url, snapshot, to_webp
from apps.core.viewsets import AuditedModelViewSet

from .models import AidRequest, ContactMessage, JobPost, ServiceProvider


class AdminAidSerializer(serializers.ModelSerializer):
    applicant_name = serializers.CharField(source="applicant.name", read_only=True, default="—")
    applicant_phone = serializers.CharField(source="applicant.user.phone", read_only=True, default=None)
    type_label = serializers.CharField(source="get_type_display", read_only=True)
    documents = serializers.SerializerMethodField()
    raised = serializers.IntegerField(read_only=True)
    image_src = serializers.SerializerMethodField()

    class Meta:
        model = AidRequest
        fields = [
            "id", "type", "type_label", "applicant_name", "applicant_phone", "beneficiary", "description", "amount_needed", "target_amount", "target_date",
            "status", "show_name_public", "public_title", "public_description", "note", "documents", "raised", "image_src", "created_at",
        ]
        read_only_fields = ["type", "beneficiary", "description", "amount_needed", "created_at"]

    def get_documents(self, a):
        return [{"name": d.name, "url": media_url(d.file), "size_kb": d.size_kb} for d in a.documents.all()]

    def get_image_src(self, a):
        return media_url(a.image, a.image_url)


class AdminAidViewSet(AuditedModelViewSet):
    """Documents are visible only here (admins). Approve opens a public fund card."""

    serializer_class = AdminAidSerializer
    permission_classes = [IsAdmin]
    http_method_names = ["get", "patch", "post", "head", "options"]
    audit_label = "beneficiary"
    queryset = AidRequest.objects.select_related("applicant__user").prefetch_related("documents")

    def _decide(self, request, a, status, summary, sms):
        before = snapshot(a)
        a.status = status
        a.save()
        audit(request.user, status, a, before=before, summary=summary)
        if a.applicant and sms:
            send_sms(a.applicant.user.phone, sms)
        return Response(self.get_serializer(a).data)

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def approve(self, request, pk=None):
        a = self.get_object()
        d = request.data
        try:
            target = int(str(d.get("target_amount") or a.amount_needed).replace(",", ""))
        except ValueError:
            raise ValidationError({"target_amount": "লক্ষ্য টাকা লিখুন"})
        a.target_amount = target
        a.target_date = d.get("target_date") or None
        a.show_name_public = str(d.get("show_name_public", "")).lower() in {"1", "true", "on"}
        a.public_title = str(d.get("public_title") or a.public_title or f"{a.get_type_display()} সহায়তা")[:160]
        a.public_description = str(d.get("public_description") or a.public_description)[:300]
        if img := request.FILES.get("image"):
            check_upload(img, field="image")
            a.image.save("aid.webp", to_webp(img, 1200), save=False)
        return self._decide(request, a, AidRequest.Status.APPROVED, f"আবেদন অনুমোদন: {a.beneficiary} · লক্ষ্য ৳{target}", "সগুনা আদর্শ যুব সমাজ: আপনার সাহায্যের আবেদন অনুমোদিত হয়েছে। পাবলিক তহবিল চালু হলো।")

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        a = self.get_object()
        a.note = str(request.data.get("note", ""))[:200]
        return self._decide(request, a, AidRequest.Status.REJECTED, f"আবেদন বাতিল: {a.beneficiary}", "সগুনা আদর্শ যুব সমাজ: দুঃখিত, এবার আপনার সাহায্যের আবেদন অনুমোদন দেওয়া যায়নি।")

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        a = self.get_object()
        a.note = str(request.data.get("note", ""))[:200]
        return self._decide(request, a, AidRequest.Status.DONE, f"সহায়তা সম্পন্ন: {a.beneficiary}", None)


class AdminServiceSerializer(serializers.ModelSerializer):
    category = serializers.SlugRelatedField(slug_field="name", queryset=ListItem.objects.filter(kind="serviceCat"), allow_null=True)

    class Meta:
        model = ServiceProvider
        fields = ["id", "name", "category", "phone", "para", "approved"]


class AdminServiceViewSet(AuditedModelViewSet):
    serializer_class = AdminServiceSerializer
    permission_classes = [IsAdmin]
    queryset = ServiceProvider.objects.select_related("category")


class AdminJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobPost
        fields = ["id", "kind", "title", "description", "published_at", "is_published"]


class AdminJobViewSet(AuditedModelViewSet):
    serializer_class = AdminJobSerializer
    permission_classes = [IsAdmin]
    queryset = JobPost.objects.all()
    audit_label = "title"


class AdminMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ["id", "name", "phone", "subject", "message", "handled", "created_at"]
        read_only_fields = ["name", "phone", "subject", "message", "created_at"]


class AdminMessageViewSet(AuditedModelViewSet):
    serializer_class = AdminMessageSerializer
    permission_classes = [IsAdmin]
    http_method_names = ["get", "patch", "head", "options"]
    queryset = ContactMessage.objects.all()
