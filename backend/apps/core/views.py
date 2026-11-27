from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Member

from .models import CommitteePosition, CommitteeTerm, EmergencyContact, HeroSlide, ListItem, SiteSetting
from .utils import media_url


def site_settings_dict(s: SiteSetting) -> dict:
    return {
        "org_name": s.org_name,
        "place": s.place,
        "address": s.address,
        "office": s.office,
        "phone": s.phone,
        "bkash": s.bkash,
        "nagad": s.nagad,
        "treasurer_name": s.treasurer_name,
        "whatsapp_url": s.whatsapp_url,
        "facebook_url": s.facebook_url,
        "youtube_url": s.youtube_url,
        "founded_year": s.founded_year,
        "hero_title": s.hero_title,
        "hero_subtitle": s.hero_subtitle,
        "hero_image": media_url(s.hero_image, s.hero_image_url),
        "hero_slides": hero_slides(s),
        "logo": media_url(s.logo),
        "logo_dark": media_url(s.logo_dark),
        "logo_icon": media_url(s.logo_icon),
    }


def hero_slides(s: SiteSetting) -> list[dict]:
    """Slideshow images in order; falls back to the single legacy hero image."""
    slides = [{"id": h.id, "image": media_url(h.image, h.image_url), "alt": h.alt} for h in HeroSlide.objects.all()]
    slides = [x for x in slides if x["image"]]
    if not slides and (img := media_url(s.hero_image, s.hero_image_url)):
        slides = [{"id": 0, "image": img, "alt": ""}]
    return slides


def lists_dict() -> dict:
    out = {k: [] for k, _ in ListItem.Kind.choices}
    for it in ListItem.objects.all():
        out[it.kind].append({"id": it.id, "name": it.name})
    return out


class SiteView(APIView):
    """Bootstrap data used by every public page: org info, stats, emergency numbers, lists."""

    permission_classes = [AllowAny]

    def get(self, request):
        from apps.content.models import Event
        from apps.finance.models import DuesSetting

        s = SiteSetting.load()
        active = Member.objects.filter(status=Member.Status.ACTIVE)
        return Response(
            {
                **site_settings_dict(s),
                "monthly_dues": DuesSetting.current_amount(),
                "stats": {
                    "members": active.count(),
                    "donors": active.filter(wants_to_donate=True).exclude(blood_group="").count(),
                    "completed_events": Event.objects.filter(status=Event.Status.COMPLETED).count(),
                    "families_helped": s.families_helped,
                },
                "emergency": [{"id": e.id, "title": e.title, "phone": e.phone} for e in EmergencyContact.objects.all()],
                "lists": lists_dict(),
            }
        )


def position_dict(p: CommitteePosition) -> dict:
    m = p.member
    return {
        "id": p.id,
        "title": p.title,
        "name": p.display_name,
        "para": (m.para.name if m and m.para else p.para_name),
        "photo": media_url(m.photo) if m else "",
        "phone": (m.user.phone if m else None) if p.show_phone else None,
        "member_id": m.id if m else None,
    }


class CommitteeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        terms = CommitteeTerm.objects.prefetch_related("positions__member__user", "positions__member__para")

        def term_dict(t):
            people = [p for p in t.positions.all() if not p.is_advisor]
            return {"id": t.id, "name": t.name, "is_current": t.is_current, "members": [position_dict(p) for p in people]}

        current = next((t for t in terms if t.is_current), None)
        advisors = []
        if current:
            advisors = [position_dict(p) for p in current.positions.all() if p.is_advisor]
        return Response(
            {
                "current": term_dict(current) if current else None,
                "past": [term_dict(t) for t in terms if not t.is_current],
                "advisors": advisors,
            }
        )


def list_usage(item: ListItem) -> int:
    """How many records use a list item (shown before delete)."""
    from apps.community.models import ServiceProvider
    from apps.content.models import Event, Notice
    from apps.finance.models import Expense, Income

    k = ListItem.Kind
    if item.kind == k.PARA:
        return item.members.count()
    if item.kind == k.NOTICE_CAT:
        return Notice.objects.filter(category=item).count()
    if item.kind == k.EVENT_CAT:
        return Event.objects.filter(category=item).count()
    if item.kind == k.INCOME_CAT:
        return Income.objects.filter(category=item).count()
    if item.kind == k.EXPENSE_CAT:
        return Expense.objects.filter(category=item).count()
    if item.kind == k.SERVICE_CAT:
        return ServiceProvider.objects.filter(category=item).count()
    if item.kind == k.PROFESSION:
        return Member.objects.filter(profession=item.name).count()
    if item.kind == k.POSITION:
        return CommitteePosition.objects.filter(title=item.name).count()
    return 0


