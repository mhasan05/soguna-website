from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.accounts.models import Role
from apps.core.models import ListItem
from apps.core.permissions import IsAdmin, RoleRequired, has_role
from apps.core.utils import audit, check_upload, media_url, to_webp
from apps.core.viewsets import AuditedModelViewSet

from .models import Album, Event, Notice, Photo, Video


class AdminNoticeSerializer(serializers.ModelSerializer):
    category = serializers.SlugRelatedField(slug_field="name", queryset=ListItem.objects.filter(kind="noticeCat"))
    image = serializers.ImageField(write_only=True, required=False)
    attachment = serializers.FileField(write_only=True, required=False)
    image_src = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.member.name", read_only=True, default=None)

    class Meta:
        model = Notice
        fields = ["id", "slug", "title", "category", "body", "highlight", "summary", "image", "image_src", "image_alt", "attachment", "attachment_url", "attachment_name", "visibility", "is_urgent", "is_pinned", "status", "author_label", "published_at", "created_by_name"]
        read_only_fields = ["slug", "published_at"]
        extra_kwargs = {"title": {"error_messages": {"blank": "শিরোনাম লিখুন"}}, "body": {"error_messages": {"blank": "নোটিশের লেখা দিন"}}}

    def get_image_src(self, n):
        return media_url(n.image, n.image_url)

    def get_attachment_url(self, n):
        return media_url(n.attachment)

    def _files(self, n, data):
        img = data.pop("image", None)
        att = data.pop("attachment", None)
        if img:
            check_upload(img, field="image")
            n.image.save("n.webp", to_webp(img, 1600), save=False)
        if att:
            check_upload(att, allowed=("image/", "application/pdf"), field="attachment")
            n.attachment.save(att.name, att, save=False)
            n.attachment_name = n.attachment_name or att.name
        return n

    def create(self, data):
        files = {k: data.pop(k) for k in ("image", "attachment") if k in data}
        n = Notice(**data)
        self._files(n, files)
        n.save()
        return n

    def update(self, n, data):
        files = {k: data.pop(k) for k in ("image", "attachment") if k in data}
        for k, v in data.items():
            setattr(n, k, v)
        self._files(n, files)
        n.save()
        return n


class AdminNoticeViewSet(AuditedModelViewSet):
    """Volunteers may only create drafts (status forced to 'pending'); admins publish."""

    serializer_class = AdminNoticeSerializer
    permission_classes = [RoleRequired(Role.VOLUNTEER)]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    audit_label = "title"

    def get_queryset(self):
        qs = Notice.objects.select_related("category", "created_by__member")
        if s := self.request.query_params.get("status"):
            qs = qs.filter(status=s)
        if not has_role(self.request.user, Role.ADMIN):
            qs = qs.filter(created_by=self.request.user)
        return qs

    def perform_create(self, serializer):
        admin = has_role(self.request.user, Role.ADMIN)
        status = serializer.validated_data.get("status", Notice.Status.PUBLISHED) if admin else Notice.Status.PENDING
        obj = serializer.save(created_by=self.request.user, status=status, published_at=timezone.now())
        audit(self.request.user, "create", obj, summary=("নোটিশ প্রকাশ: " if status == "published" else "নোটিশের খসড়া: ") + obj.title)

    def perform_update(self, serializer):
        if not has_role(self.request.user, Role.ADMIN):
            if serializer.instance.status == Notice.Status.PUBLISHED:
                raise PermissionDenied("প্রকাশিত নোটিশ এডিট করতে পারেন শুধু অ্যাডমিন")
            serializer.validated_data["status"] = Notice.Status.PENDING
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        if not has_role(self.request.user, Role.ADMIN):
            raise PermissionDenied("মুছতে পারেন শুধু অ্যাডমিন")
        super().perform_destroy(instance)

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def publish(self, request, pk=None):
        n = self.get_object()
        n.status = Notice.Status.PUBLISHED
        n.published_at = timezone.now()
        n.save()
        audit(request.user, "approve", n, summary=f"খসড়া অনুমোদন ও প্রকাশ: {n.title}")
        return Response(self.get_serializer(n).data)


class AdminEventSerializer(serializers.ModelSerializer):
    category = serializers.SlugRelatedField(slug_field="name", queryset=ListItem.objects.filter(kind="eventCat"), allow_null=True, required=False)
    cover = serializers.ImageField(write_only=True, required=False)
    cover_src = serializers.SerializerMethodField()
    going_count = serializers.SerializerMethodField()
    volunteer_count = serializers.SerializerMethodField()
    photo_count = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id", "slug", "title", "category", "cover", "cover_src", "description", "venue", "start_at", "end_at", "time_note", "status", "meta_note",
            "offline_going", "offline_volunteers", "report", "beneficiaries_count", "beneficiary_label", "report_volunteers", "report_cost",
            "going_count", "volunteer_count", "photo_count",
        ]
        read_only_fields = ["slug"]

    def get_cover_src(self, e):
        return media_url(e.cover, e.cover_url)

    def get_going_count(self, e):
        return e.offline_going + e.rsvps.filter(going=True).count()

    def get_volunteer_count(self, e):
        return e.offline_volunteers + e.rsvps.filter(is_volunteer=True).count()

    def get_photo_count(self, e):
        return Photo.objects.filter(album__event=e).count()

    def _cover(self, e, img):
        if img:
            check_upload(img, field="cover")
            e.cover.save("cover.webp", to_webp(img, 1600), save=False)

    def create(self, data):
        img = data.pop("cover", None)
        e = Event(**data)
        self._cover(e, img)
        e.save()
        return e

    def update(self, e, data):
        img = data.pop("cover", None)
        for k, v in data.items():
            setattr(e, k, v)
        self._cover(e, img)
        e.save()
        return e


class AdminEventViewSet(AuditedModelViewSet):
    serializer_class = AdminEventSerializer
    permission_classes = [RoleRequired(Role.VOLUNTEER)]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    audit_label = "title"
    queryset = Event.objects.select_related("category").order_by("-start_at")

    def perform_destroy(self, instance):
        if not has_role(self.request.user, Role.ADMIN):
            raise PermissionDenied("মুছতে পারেন শুধু অ্যাডমিন")
        super().perform_destroy(instance)

    @action(detail=True, methods=["get"])
    def attendees(self, request, pk=None):
        e = self.get_object()
        rows = e.rsvps.filter(going=True).select_related("member__user", "member__para")
        return Response([{"name": r.member.name, "para": r.member.para.name if r.member.para else "", "phone": r.member.user.phone, "is_volunteer": r.is_volunteer} for r in rows])


class AdminPhotoSerializer(serializers.ModelSerializer):
    src = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ["id", "src", "caption", "size_kb", "order"]

    def get_src(self, p):
        return media_url(p.image, p.image_url)


class AdminAlbumSerializer(serializers.ModelSerializer):
    photos = AdminPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = Album
        fields = ["id", "slug", "title", "event", "description", "is_memory", "order", "photos"]
        read_only_fields = ["slug"]


class AdminAlbumViewSet(AuditedModelViewSet):
    serializer_class = AdminAlbumSerializer
    permission_classes = [RoleRequired(Role.VOLUNTEER)]
    audit_label = "title"
    queryset = Album.objects.prefetch_related("photos")

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser])
    def upload(self, request, pk=None):
        """Bulk upload: every image is resized and stored as WebP."""
        album = self.get_object()
        files = request.FILES.getlist("photos")
        if not files:
            raise ValidationError({"photos": "ছবি বাছুন"})
        created = []
        start = album.photos.count()
        for i, f in enumerate(files):
            check_upload(f, field="photos")
            webp = to_webp(f, 1600)
            p = Photo(album=album, caption=request.data.get("caption", ""), order=start + i, size_kb=round(webp.size / 1024))
            p.image.save(webp.name, webp, save=True)
            created.append(p)
        audit(request.user, "upload", album, summary=f'{len(created)}টি ছবি "{album.title}" অ্যালবামে')
        return Response(AdminPhotoSerializer(created, many=True).data, status=201)

    @action(detail=True, methods=["delete"], url_path=r"photos/(?P<photo_id>\d+)")
    def delete_photo(self, request, pk=None, photo_id=None):
        album = self.get_object()
        p = album.photos.filter(pk=photo_id).first()
        if not p:
            raise ValidationError({"detail": "ছবি পাওয়া যায়নি"})
        p.image.delete(save=False)
        p.delete()
        audit(request.user, "delete", None, model="content.Photo", object_id=photo_id, summary=f'"{album.title}" থেকে ছবি মুছে ফেলা')
        return Response(status=204)


class AdminVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = ["id", "title", "youtube_url", "thumbnail_url", "duration_label"]

    def validate_youtube_url(self, v):
        if "youtu" not in v:
            raise ValidationError("YouTube লিংক দিন")
        return v


class AdminVideoViewSet(AuditedModelViewSet):
    serializer_class = AdminVideoSerializer
    permission_classes = [RoleRequired(Role.VOLUNTEER)]
    audit_label = "title"
    queryset = Video.objects.all()
