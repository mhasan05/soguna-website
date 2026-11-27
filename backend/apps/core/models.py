from django.conf import settings
from django.db import models


class ListItem(models.Model):
    """Admin-editable lists used across the site (তালিকা ও ক্যাটাগরি)."""

    class Kind(models.TextChoices):
        PARA = "para", "পাড়া / মহল্লা"
        NOTICE_CAT = "noticeCat", "নোটিশ ক্যাটাগরি"
        EVENT_CAT = "eventCat", "ইভেন্ট ক্যাটাগরি"
        INCOME_CAT = "incomeCat", "আয়ের খাত"
        EXPENSE_CAT = "expenseCat", "ব্যয়ের খাত"
        SERVICE_CAT = "serviceCat", "সেবার ক্যাটাগরি"
        PROFESSION = "profession", "পেশা"
        POSITION = "position", "কমিটির পদবি"

    kind = models.CharField(max_length=12, choices=Kind.choices, db_index=True)
    name = models.CharField(max_length=80)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["kind", "order", "id"]
        constraints = [models.UniqueConstraint(fields=["kind", "name"], name="unique_list_item")]

    def __str__(self):
        return f"{self.get_kind_display()}: {self.name}"


class SiteSetting(models.Model):
    """Singleton (pk=1) — organisation info, payment numbers, social links, SMS, hero."""

    org_name = models.CharField(max_length=120, default="সগুনা আদর্শ যুব সমাজ")
    place = models.CharField(max_length=120, default="বেলকুচি, সিরাজগঞ্জ")
    address = models.CharField(max_length=200, default="গ্রাম সগুনা, উপজেলা বেলকুচি, জেলা সিরাজগঞ্জ")
    office = models.CharField(max_length=120, default="সগুনা বাজার ক্লাব ঘর")
    phone = models.CharField(max_length=20, default="017XXXXXXXX")
    bkash = models.CharField(max_length=20, default="017XXXXXXXX")
    nagad = models.CharField(max_length=20, default="018XXXXXXXX")
    treasurer_name = models.CharField(max_length=120, default="মোঃ জাহিদুল আলম")
    whatsapp_url = models.URLField(default="https://chat.whatsapp.com/", blank=True)
    facebook_url = models.URLField(default="https://facebook.com/", blank=True)
    youtube_url = models.URLField(blank=True)
    sms_gateway = models.CharField(max_length=60, default="নির্বাচন বাকি", blank=True)
    sms_sender_id = models.CharField(max_length=20, default="SOGUNA", blank=True)
    founded_year = models.PositiveIntegerField(default=2026)
    families_helped = models.PositiveIntegerField(default=0, help_text="হোমের 'সাহায্য পেয়েছেন এমন পরিবার'")
    hero_title = models.CharField(max_length=160, default="আমরা সগুনার তরুণ, আমরা এক সাথে")
    hero_subtitle = models.CharField(max_length=240, default="রক্তদান, সমাজসেবা আর বিপদে মানুষের পাশে দাঁড়ানো — গ্রামের সবাইকে নিয়ে এক পরিবার।")
    hero_image = models.ImageField(upload_to="site/", blank=True)
    hero_image_url = models.URLField(blank=True)
    # Branding (admin → সেটিংস → লোগো). Empty = the frontend's bundled default logo.
    logo = models.ImageField(upload_to="brand/", blank=True, help_text="আড়াআড়ি লোগো — হালকা ব্যাকগ্রাউন্ডের জন্য")
    logo_dark = models.ImageField(upload_to="brand/", blank=True, help_text="আড়াআড়ি লোগো — গাঢ়/সবুজ ব্যাকগ্রাউন্ডের জন্য (সাদা লেখা)")
    logo_icon = models.ImageField(upload_to="brand/", blank=True, help_text="শুধু প্রতীক (বর্গাকার) — ব্রাউজার আইকন, ছোট জায়গা")

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class HeroSlide(models.Model):
    """Home page hero slideshow image (admin uploads several, ▲▼ ordered)."""

    image = models.ImageField(upload_to="hero/", blank=True)
    image_url = models.URLField(blank=True)  # seeded placeholder photos
    alt = models.CharField(max_length=160, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.alt or f"হিরো ছবি {self.pk}"


class EmergencyContact(models.Model):
    title = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]


class CommitteeTerm(models.Model):
    name = models.CharField(max_length=60)  # e.g. "২০২৬–২০২৭"
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)

    class Meta:
        ordering = ["-start_date"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_current:
            CommitteeTerm.objects.exclude(pk=self.pk).update(is_current=False)


class CommitteePosition(models.Model):
    term = models.ForeignKey(CommitteeTerm, on_delete=models.CASCADE, related_name="positions")
    member = models.ForeignKey("accounts.Member", null=True, blank=True, on_delete=models.SET_NULL)
    # Advisors may not be members; fall back to a plain name.
    person_name = models.CharField(max_length=120, blank=True)
    para_name = models.CharField(max_length=60, blank=True)
    title = models.CharField(max_length=80)
    order = models.PositiveIntegerField(default=0)
    is_advisor = models.BooleanField(default=False)
    show_phone = models.BooleanField(default=False, help_text="শুধু সভাপতি ও সাধারণ সম্পাদক")

    class Meta:
        ordering = ["order", "id"]

    @property
    def display_name(self):
        return self.member.name if self.member else self.person_name


class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=20)  # create / update / delete / void / approve / ...
    model = models.CharField(max_length=60)
    object_id = models.CharField(max_length=40)
    summary = models.CharField(max_length=240, blank=True)
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-timestamp"]
