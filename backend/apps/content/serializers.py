from django.db.models import Sum
from rest_framework import serializers

from apps.core.permissions import active_member
from apps.core.utils import media_url

from .models import Album, Event, Notice, Photo, Video


def can_see_members_only(request) -> bool:
    u = getattr(request, "user", None)
    return bool(active_member(u) or getattr(u, "is_committee", False))


class NoticeListSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", default="অন্যান্য")
    members_only = serializers.SerializerMethodField()
    preview = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Notice
        fields = ["id", "slug", "title", "category", "published_at", "preview", "highlight", "summary", "is_pinned", "is_urgent", "members_only", "image", "author_label"]

    def get_members_only(self, n):
        return n.visibility == Notice.Visibility.MEMBERS

    def _locked(self, n):
        return n.visibility == Notice.Visibility.MEMBERS and not can_see_members_only(self.context.get("request"))

    def get_preview(self, n):
        if self._locked(n):
            return ""
        text = " ".join(n.body.split())
        return text[:200] + ("…" if len(text) > 200 else "")

    def get_image(self, n):
        return media_url(n.image, n.image_url)


class NoticeDetailSerializer(NoticeListSerializer):
    body = serializers.SerializerMethodField()
    locked = serializers.SerializerMethodField()
    attachment = serializers.SerializerMethodField()

    class Meta(NoticeListSerializer.Meta):
        fields = NoticeListSerializer.Meta.fields + ["body", "locked", "image_alt", "attachment"]

    def get_locked(self, n):
        return self._locked(n)

    def get_body(self, n):
        if self._locked(n):
            return []
        return [p.strip() for p in n.body.replace("\r", "").split("\n\n") if p.strip()]

    def get_attachment(self, n):
        if not n.attachment or self._locked(n):
            return None
        name = n.attachment.name.lower()
        try:
            size = n.attachment.size
        except OSError:
            size = 0
        return {
            "url": media_url(n.attachment),
            "name": n.attachment_name or n.attachment.name.rsplit("/", 1)[-1],
            "size_kb": round(size / 1024),
            "kind": "PDF" if name.endswith(".pdf") else "JPG",
        }


class EventListSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", default="")
    cover = serializers.SerializerMethodField()
    going_count = serializers.SerializerMethodField()
    volunteer_count = serializers.SerializerMethodField()
    report = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = ["id", "slug", "title", "category", "status", "start_at", "end_at", "time_note", "venue", "cover", "meta_note", "going_count", "volunteer_count", "report"]

    def get_cover(self, e):
        return media_url(e.cover, e.cover_url)

    def get_going_count(self, e):
        return e.offline_going + e.rsvps.filter(going=True).count()

    def get_volunteer_count(self, e):
        return e.offline_volunteers + e.rsvps.filter(is_volunteer=True).count()

    def get_report(self, e):
        if e.status != Event.Status.COMPLETED:
            return None
        cost = e.report_cost
        if cost is None:
            from apps.finance.models import Expense

            cost = Expense.objects.filter(event=e, is_void=False).aggregate(s=Sum("amount"))["s"] or 0
        return {
            "beneficiaries": e.beneficiaries_count,
            "beneficiary_label": e.beneficiary_label,
            "cost": cost,
            "volunteers": e.report_volunteers,
            "text": e.report,
        }


class EventDetailSerializer(EventListSerializer):
    photos = serializers.SerializerMethodField()
    my_rsvp = serializers.SerializerMethodField()

    class Meta(EventListSerializer.Meta):
        fields = EventListSerializer.Meta.fields + ["description", "photos", "my_rsvp"]

    def get_photos(self, e):
        return [media_url(p.image, p.image_url) for p in Photo.objects.filter(album__event=e)]

    def get_my_rsvp(self, e):
        m = active_member(self.context["request"].user)
        r = e.rsvps.filter(member=m).first() if m else None
        return {"going": r.going, "is_volunteer": r.is_volunteer} if r else {"going": False, "is_volunteer": False}


class PhotoSerializer(serializers.ModelSerializer):
    src = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ["id", "src", "caption", "size_kb"]

    def get_src(self, p):
        return media_url(p.image, p.image_url)


class AlbumSerializer(serializers.ModelSerializer):
    covers = serializers.SerializerMethodField()
    photo_count = serializers.IntegerField(source="photos.count", read_only=True)

    class Meta:
        model = Album
        fields = ["id", "slug", "title", "description", "is_memory", "created_at", "covers", "photo_count"]

    def get_covers(self, a):
        return [media_url(p.image, p.image_url) for p in a.photos.all()[:3]]


class AlbumDetailSerializer(AlbumSerializer):
    photos = PhotoSerializer(many=True, read_only=True)

    class Meta(AlbumSerializer.Meta):
        fields = AlbumSerializer.Meta.fields + ["photos"]


class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = ["id", "title", "youtube_url", "thumbnail_url", "duration_label"]
