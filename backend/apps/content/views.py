from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsActiveMember, active_member

from .models import Album, Event, EventRSVP, Notice, Video
from .serializers import AlbumDetailSerializer, AlbumSerializer, EventDetailSerializer, EventListSerializer, NoticeDetailSerializer, NoticeListSerializer, VideoSerializer


class NoticeList(generics.ListAPIView):
    """GET /notices/?category=সভা&limit=3 — pinned first, newest first. Members-only items stay listed but locked."""

    permission_classes = [AllowAny]
    serializer_class = NoticeListSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Notice.objects.filter(status=Notice.Status.PUBLISHED).select_related("category")
        if c := self.request.query_params.get("category"):
            qs = qs.filter(category__name=c)
        if self.request.query_params.get("urgent") == "1":
            qs = qs.filter(is_urgent=True)
        if limit := self.request.query_params.get("limit"):
            qs = qs[: int(limit)]
        return qs


class NoticeDetail(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = NoticeDetailSerializer
    lookup_field = "slug"
    queryset = Notice.objects.filter(status=Notice.Status.PUBLISHED).select_related("category")


class EventList(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = EventListSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Event.objects.select_related("category").prefetch_related("rsvps")
        status = self.request.query_params.get("status")
        if status == "completed":
            return qs.filter(status=status).order_by("-start_at")
        if status == "upcoming":
            return qs.filter(status=status).order_by("start_at")
        return qs


class EventDetail(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = EventDetailSerializer
    lookup_field = "slug"
    queryset = Event.objects.select_related("category")


class EventRSVPView(APIView):
    """POST {going, is_volunteer} — 'আমি আসছি' and the volunteer checkbox."""

    permission_classes = [IsActiveMember]

    def post(self, request, slug):
        event = get_object_or_404(Event, slug=slug, status=Event.Status.UPCOMING)
        member = active_member(request.user)
        rsvp, _ = EventRSVP.objects.get_or_create(event=event, member=member, defaults={"going": False})
        if "going" in request.data:
            rsvp.going = bool(request.data["going"])
        if "is_volunteer" in request.data:
            rsvp.is_volunteer = bool(request.data["is_volunteer"])
            if rsvp.is_volunteer:
                rsvp.going = True
        rsvp.save()
        return Response(EventDetailSerializer(event, context={"request": request}).data)


class AlbumList(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = AlbumSerializer
    pagination_class = None
    queryset = Album.objects.prefetch_related("photos")


class AlbumDetail(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = AlbumDetailSerializer
    lookup_field = "slug"
    queryset = Album.objects.prefetch_related("photos")


class VideoList(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = VideoSerializer
    pagination_class = None
    queryset = Video.objects.all()
