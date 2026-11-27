import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


def unique_slug(model, text: str, instance_pk=None) -> str:
    base = (slugify(text, allow_unicode=True) or "item")[:60].strip("-") or "item"
    slug = base
    while model.objects.filter(slug=slug).exclude(pk=instance_pk).exists():
        slug = f"{base}-{secrets.token_hex(2)}"
    return slug


class Notice(models.Model):
    class Visibility(models.TextChoices):
        PUBLIC = "public", "পাবলিক"
        MEMBERS = "members", "সদস্য-কেবল"

    class Status(models.TextChoices):
        DRAFT = "draft", "খসড়া"
        PENDING = "pending", "অনুমোদনের অপেক্ষায়"
        PUBLISHED = "published", "প্রকাশিত"

    slug = models.SlugField(max_length=80, unique=True, allow_unicode=True, blank=True)
    title = models.CharField(max_length=200)
    category = models.ForeignKey("core.ListItem", null=True, on_delete=models.SET_NULL, related_name="notices")
    body = models.TextField(help_text="অনুচ্ছেদ আলাদা করতে ফাঁকা লাইন দিন")
    highlight = models.CharField(max_length=160, blank=True, help_text="হোমের জরুরি ব্যানারে মোটা অক্ষরে")
    summary = models.CharField(max_length=400, blank=True)
    image = models.ImageField(upload_to="notices/", blank=True)
    image_url = models.URLField(blank=True)
    image_alt = models.CharField(max_length=160, blank=True)
    attachment = models.FileField(upload_to="notices/files/", blank=True)
    attachment_name = models.CharField(max_length=120, blank=True)
    visibility = models.CharField(max_length=8, choices=Visibility.choices, default=Visibility.PUBLIC)
    is_urgent = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PUBLISHED)
    author_label = models.CharField(max_length=80, blank=True, help_text="যেমন: সাধারণ সম্পাদক")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    published_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-is_pinned", "-published_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(Notice, self.title, self.pk)
        super().save(*args, **kwargs)


class Event(models.Model):
    class Status(models.TextChoices):
        UPCOMING = "upcoming", "আসন্ন"
        COMPLETED = "completed", "সম্পন্ন"

    slug = models.SlugField(max_length=80, unique=True, allow_unicode=True, blank=True)
    title = models.CharField(max_length=200)
    category = models.ForeignKey("core.ListItem", null=True, on_delete=models.SET_NULL, related_name="events")
    cover = models.ImageField(upload_to="events/", blank=True)
    cover_url = models.URLField(blank=True)
    description = models.TextField(blank=True)
    venue = models.CharField(max_length=160)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    time_note = models.CharField(max_length=80, blank=True, help_text="যেমন: বাদ জুমা — সময়ের বদলে দেখাবে")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.UPCOMING)
    meta_note = models.CharField(max_length=80, blank=True, help_text="কার্ডে 'N জন আসছেন'-এর বদলে, যেমন: ৮টি দল নিবন্ধিত")
    offline_going = models.PositiveIntegerField(default=0, help_text="সাইটের বাইরে নাম দেওয়া অংশগ্রহণকারী")
    offline_volunteers = models.PositiveIntegerField(default=0)
    # Report (completed events)
    report = models.TextField(blank=True)
    beneficiaries_count = models.PositiveIntegerField(null=True, blank=True)
    beneficiary_label = models.CharField(max_length=40, default="পরিবার উপকৃত", blank=True)
    report_volunteers = models.PositiveIntegerField(null=True, blank=True)
    report_cost = models.PositiveIntegerField(null=True, blank=True, help_text="ফাঁকা থাকলে লিংক করা খরচ যোগ হবে")

    class Meta:
        ordering = ["start_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(Event, self.title, self.pk)
        super().save(*args, **kwargs)


class EventRSVP(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="rsvps")
    member = models.ForeignKey("accounts.Member", on_delete=models.CASCADE, related_name="rsvps")
    going = models.BooleanField(default=True)
    is_volunteer = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["event", "member"], name="one_rsvp_per_member")]


class Album(models.Model):
    slug = models.SlugField(max_length=80, unique=True, allow_unicode=True, blank=True)
    title = models.CharField(max_length=160)
    event = models.ForeignKey(Event, null=True, blank=True, on_delete=models.SET_NULL, related_name="albums")
    description = models.CharField(max_length=160, blank=True)
    is_memory = models.BooleanField(default=False, help_text="সগুনার স্মৃতি — সোনালি বর্ডার")
    created_at = models.DateTimeField(default=timezone.now)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(Album, self.title, self.pk)
        super().save(*args, **kwargs)


class Photo(models.Model):
    album = models.ForeignKey(Album, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="gallery/", blank=True)
    image_url = models.URLField(blank=True)
    caption = models.CharField(max_length=160, blank=True)
    size_kb = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]


class Video(models.Model):
    title = models.CharField(max_length=160)
    youtube_url = models.URLField()
    thumbnail_url = models.URLField(blank=True)
    duration_label = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
