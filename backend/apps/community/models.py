from django.db import models
from django.db.models import Sum

from apps.accounts.models import BLOOD_GROUPS


class BloodRequest(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "খোলা"
        FULFILLED = "fulfilled", "রক্ত পাওয়া গেছে"
        CLOSED = "closed", "বন্ধ"

    patient_name = models.CharField(max_length=120)
    blood_group = models.CharField(max_length=4, choices=BLOOD_GROUPS)
    bags = models.PositiveSmallIntegerField(default=1)
    hospital = models.CharField(max_length=160)
    phone = models.CharField(max_length=11)
    needed_by = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    notified_donors = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class AidRequest(models.Model):
    class Type(models.TextChoices):
        MEDICAL = "medical", "চিকিৎসা"
        EDUCATION = "education", "শিক্ষা"
        DISASTER = "disaster", "দুর্যোগ"
        OTHER = "other", "অন্যান্য"

    class Status(models.TextChoices):
        PENDING = "pending", "অপেক্ষমাণ"
        APPROVED = "approved", "অনুমোদিত"
        REJECTED = "rejected", "বাতিল"
        DONE = "done", "সম্পন্ন"

    applicant = models.ForeignKey("accounts.Member", null=True, blank=True, on_delete=models.SET_NULL, related_name="aid_requests")
    type = models.CharField(max_length=10, choices=Type.choices)
    beneficiary = models.CharField(max_length=160, help_text="কার জন্য")
    description = models.TextField()
    amount_needed = models.PositiveIntegerField()
    target_amount = models.PositiveIntegerField(null=True, blank=True)
    target_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    show_name_public = models.BooleanField(default=False)
    # Public fund card (written by the committee; never exposes private details by default)
    public_title = models.CharField(max_length=160, blank=True)
    public_description = models.CharField(max_length=300, blank=True)
    image = models.ImageField(upload_to="aid/", blank=True)
    image_url = models.URLField(blank=True)
    note = models.CharField(max_length=200, blank=True, help_text="আবেদনকারী যা দেখবেন")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def raised(self) -> int:
        from apps.finance.models import VerifyStatus

        return self.donations.filter(status=VerifyStatus.VERIFIED).aggregate(s=Sum("amount"))["s"] or 0


class AidDocument(models.Model):
    aid_request = models.ForeignKey(AidRequest, on_delete=models.CASCADE, related_name="documents")
    file = models.FileField(upload_to="aid/docs/")
    name = models.CharField(max_length=160)
    size_kb = models.PositiveIntegerField(default=0)


class ServiceProvider(models.Model):
    name = models.CharField(max_length=160)
    category = models.ForeignKey("core.ListItem", null=True, on_delete=models.SET_NULL, related_name="services")
    phone = models.CharField(max_length=20)
    para = models.CharField(max_length=60, blank=True)
    approved = models.BooleanField(default=False)

    class Meta:
        ordering = ["category__order", "name"]


class JobPost(models.Model):
    class Kind(models.TextChoices):
        JOB = "job", "চাকরি"
        SCHOLARSHIP = "scholarship", "বৃত্তি"
        RECEPTION = "reception", "সংবর্ধনা"

    kind = models.CharField(max_length=12, choices=Kind.choices)
    title = models.CharField(max_length=200)
    description = models.TextField()
    published_at = models.DateField()
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ["-published_at"]


class ContactMessage(models.Model):
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=11)
    subject = models.CharField(max_length=160, blank=True)
    message = models.TextField()
    handled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
