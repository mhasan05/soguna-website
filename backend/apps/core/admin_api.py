from django.db import transaction
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CommitteePosition, CommitteeTerm, EmergencyContact, HeroSlide, ListItem, SiteSetting
from .permissions import IsAdmin
from .utils import audit, check_upload, media_url, snapshot, to_webp
from .views import list_usage, site_settings_dict
from .viewsets import AuditedModelViewSet


def reorder(model, ids):
    """Persist a new order from a list of ids (▲▼ in the admin)."""
    with transaction.atomic():
        for i, pk in enumerate(ids):
            model.objects.filter(pk=pk).update(order=i)


class ListItemSerializer(serializers.ModelSerializer):
    usage = serializers.SerializerMethodField()

    class Meta:
        model = ListItem
        fields = ["id", "kind", "name", "order", "usage"]

    def get_usage(self, obj):
        return list_usage(obj)

    def validate(self, attrs):
        kind = attrs.get("kind", getattr(self.instance, "kind", None))
        name = attrs.get("name", getattr(self.instance, "name", "")).strip()
        if not name:
            raise ValidationError({"name": "নাম লিখুন"})
        qs = ListItem.objects.filter(kind=kind, name=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise ValidationError({"name": f'"{name}" আগে থেকেই আছে'})
        attrs["name"] = name
        return attrs


class ListItemViewSet(AuditedModelViewSet):
    serializer_class = ListItemSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = ListItem.objects.all()
        if k := self.request.query_params.get("kind"):
            qs = qs.filter(kind=k)
        return qs

    def perform_create(self, serializer):
        kind = serializer.validated_data["kind"]
        last = ListItem.objects.filter(kind=kind).order_by("-order").first()
        serializer.validated_data["order"] = (last.order + 1) if last else 0
        super().perform_create(serializer)

    def perform_destroy(self, instance):
        """Records using the item move to 'অন্যান্য' (created if needed) instead of losing their value."""
        if list_usage(instance):
            other, _ = ListItem.objects.get_or_create(kind=instance.kind, name="অন্যান্য", defaults={"order": 999})
            if other.pk == instance.pk:
                raise ValidationError({"detail": '"অন্যান্য" ব্যবহৃত হচ্ছে — মোছা যাবে না'})
            self._reassign(instance, other)
        super().perform_destroy(instance)

    @staticmethod
    def _reassign(old, new):
        from apps.accounts.models import Member
        from apps.community.models import ServiceProvider
        from apps.content.models import Event, Notice
        from apps.finance.models import Expense, Income

        K = ListItem.Kind
        if old.kind == K.PARA:
            Member.objects.filter(para=old).update(para=new)
        elif old.kind == K.PROFESSION:
            Member.objects.filter(profession=old.name).update(profession=new.name)
        elif old.kind == K.POSITION:
            CommitteePosition.objects.filter(title=old.name).update(title=new.name)
        else:
            model = {K.NOTICE_CAT: Notice, K.EVENT_CAT: Event, K.INCOME_CAT: Income, K.EXPENSE_CAT: Expense, K.SERVICE_CAT: ServiceProvider}[old.kind]
            model.objects.filter(category=old).update(category=new)

    def perform_update(self, serializer):
        old_name = serializer.instance.name
        super().perform_update(serializer)
        item = serializer.instance
        # Char-based references follow a rename.
        if old_name != item.name:
            from apps.accounts.models import Member

            if item.kind == ListItem.Kind.PROFESSION:
                Member.objects.filter(profession=old_name).update(profession=item.name)
            if item.kind == ListItem.Kind.POSITION:
                CommitteePosition.objects.filter(title=old_name).update(title=item.name)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        reorder(ListItem, request.data.get("ids", []))
        return Response({"ok": True})


class SettingsView(APIView):
    permission_classes = [IsAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    FIELDS = ["org_name", "place", "address", "office", "phone", "bkash", "nagad", "treasurer_name", "whatsapp_url", "facebook_url", "youtube_url", "sms_gateway", "sms_sender_id", "founded_year", "families_helped", "hero_title", "hero_subtitle"]

    def _data(self, s):
        return {**site_settings_dict(s), "sms_gateway": s.sms_gateway, "sms_sender_id": s.sms_sender_id, "families_helped": s.families_helped}

    def get(self, request):
        return Response(self._data(SiteSetting.load()))

    def patch(self, request):
        s = SiteSetting.load()
        before = snapshot(s)
        for f in self.FIELDS:
            if f in request.data:
                setattr(s, f, request.data[f])
        if img := request.FILES.get("hero_image"):
            check_upload(img, field="hero_image")
            s.hero_image.save("hero.webp", to_webp(img, 1600), save=False)
        for f, px in (("logo", 1600), ("logo_dark", 1600), ("logo_icon", 512)):
            if img := request.FILES.get(f):
                check_upload(img, field=f)
                getattr(s, f).save(f"{f}.webp", to_webp(img, px, lossless=True), save=False)
            elif str(request.data.get(f"{f}_reset", "")).lower() in ("1", "true"):
                getattr(s, f).delete(save=False)  # back to the bundled default
        try:
            s.full_clean()
        except Exception as e:
            raise ValidationError(getattr(e, "message_dict", {"detail": str(e)}))
        s.save()
        audit(request.user, "update", s, before=before, summary="সেটিংস হালনাগাদ")
        return Response(self._data(s))


class HeroSlideSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = HeroSlide
        fields = ["id", "image", "alt", "order"]

    def get_image(self, obj):
        return media_url(obj.image, obj.image_url)


class HeroSlideViewSet(AuditedModelViewSet):
    """List / edit alt / delete / reorder; POST with one or more `images` files adds slides."""

    serializer_class = HeroSlideSerializer
    permission_classes = [IsAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    queryset = HeroSlide.objects.all()
    audit_label = "alt"

    def create(self, request, *args, **kwargs):
        files = request.FILES.getlist("images")
        if not files:
            raise ValidationError({"images": "ছবি বাছুন"})
        for f in files:
            check_upload(f, field="images")
        last = HeroSlide.objects.order_by("-order").first()
        start = (last.order + 1) if last else 0
        created = []
        for i, f in enumerate(files):
            webp = to_webp(f, 1920)
            h = HeroSlide(alt=request.data.get("alt", ""), order=start + i)
            h.image.save(webp.name, webp, save=True)
            created.append(h)
        audit(request.user, "upload", created[0], summary=f"{len(created)}টি হিরো ছবি যোগ")
        return Response(HeroSlideSerializer(created, many=True).data, status=201)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        reorder(HeroSlide, request.data.get("ids", []))
        return Response({"ok": True})


class EmergencySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = ["id", "title", "phone", "order"]


class EmergencyViewSet(AuditedModelViewSet):
    serializer_class = EmergencySerializer
    permission_classes = [IsAdmin]
    queryset = EmergencyContact.objects.all()
    audit_label = "title"

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        reorder(EmergencyContact, request.data.get("ids", []))
        return Response({"ok": True})


class PositionSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.name", read_only=True, default=None)

    class Meta:
        model = CommitteePosition
        fields = ["id", "term", "title", "member", "member_name", "person_name", "para_name", "order", "is_advisor", "show_phone"]


class PositionViewSet(AuditedModelViewSet):
    serializer_class = PositionSerializer
    permission_classes = [IsAdmin]
    audit_label = "title"

    def get_queryset(self):
        qs = CommitteePosition.objects.select_related("member")
        if t := self.request.query_params.get("term"):
            qs = qs.filter(term_id=t)
        return qs

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        reorder(CommitteePosition, request.data.get("ids", []))
        return Response({"ok": True})


class TermSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommitteeTerm
        fields = ["id", "name", "start_date", "end_date", "is_current"]


class TermViewSet(AuditedModelViewSet):
    serializer_class = TermSerializer
    permission_classes = [IsAdmin]
    queryset = CommitteeTerm.objects.all()


