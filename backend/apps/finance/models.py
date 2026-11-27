"""
Money. Per the PRD there is no stored balance: income = verified dues + verified donations
+ non-void manual income; expense = non-void expenses. Nothing here is ever deleted — only voided.
"""

from datetime import date

from django.conf import settings
from django.db import models

METHODS = [("bkash", "bKash"), ("nagad", "Nagad"), ("cash", "নগদ")]


class VerifyStatus(models.TextChoices):
    PENDING = "pending", "যাচাইয়ের অপেক্ষায়"
    VERIFIED = "verified", "যাচাইকৃত"
    REJECTED = "rejected", "মেলেনি"


class DuesSetting(models.Model):
    monthly_amount = models.PositiveIntegerField(default=200)
    effective_from = models.DateField(default=date(2026, 1, 1))

    class Meta:
        ordering = ["-effective_from"]

    @classmethod
    def current_amount(cls, on: date | None = None) -> int:
        on = on or date.today()
        s = cls.objects.filter(effective_from__lte=on).first() or cls.objects.first()
        return s.monthly_amount if s else 200


class DuesPayment(models.Model):
    member = models.ForeignKey("accounts.Member", on_delete=models.PROTECT, related_name="dues")
    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField()  # 1–12
    amount = models.PositiveIntegerField()
    method = models.CharField(max_length=6, choices=METHODS)
    trx_id = models.CharField(max_length=30, blank=True, db_index=True)
    batch = models.CharField(max_length=32, blank=True, help_text="একসাথে জমা দেওয়া মাসগুলোর গ্রুপ", db_index=True)
    status = models.CharField(max_length=10, choices=VerifyStatus.choices, default=VerifyStatus.PENDING)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["member", "year", "month"])]


class Donation(models.Model):
    class Purpose(models.TextChoices):
        GENERAL = "general", "সাধারণ তহবিল"
        EVENT = "event", "নির্দিষ্ট ইভেন্ট"
        AID = "aid_request", "সাহায্যের আবেদন"

    donor_name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=11, blank=True)
    is_anonymous = models.BooleanField(default=False)
    amount = models.PositiveIntegerField()
    purpose = models.CharField(max_length=12, choices=Purpose.choices, default=Purpose.GENERAL)
    event = models.ForeignKey("content.Event", null=True, blank=True, on_delete=models.SET_NULL, related_name="donations")
    aid_request = models.ForeignKey("community.AidRequest", null=True, blank=True, on_delete=models.SET_NULL, related_name="donations")
    method = models.CharField(max_length=6, choices=METHODS)
    trx_id = models.CharField(max_length=30, blank=True, db_index=True)
    status = models.CharField(max_length=10, choices=VerifyStatus.choices, default=VerifyStatus.PENDING)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def public_name(self):
        return "নাম প্রকাশে অনিচ্ছুক" if self.is_anonymous or not self.donor_name else self.donor_name


class LedgerEntry(models.Model):
    """Shared fields for manual income and expenses."""

    category = models.ForeignKey("core.ListItem", null=True, on_delete=models.SET_NULL, related_name="+")
    amount = models.PositiveIntegerField()
    date = models.DateField()
    description = models.CharField(max_length=200, blank=True)
    event = models.ForeignKey("content.Event", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    aid_request = models.ForeignKey("community.AidRequest", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    is_void = models.BooleanField(default=False)
    void_reason = models.CharField(max_length=200, blank=True)

    class Meta:
        abstract = True
        ordering = ["-date", "-id"]


class Income(LedgerEntry):
    """Manual income (sponsorship, cash donations entered by the cashier, …)."""


class Expense(LedgerEntry):
    voucher_image = models.ImageField(upload_to="vouchers/", blank=True)
