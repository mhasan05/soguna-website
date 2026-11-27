from datetime import date, timedelta

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

BLOOD_GROUPS = [(g, g) for g in ["A+", "A−", "B+", "B−", "O+", "O−", "AB+", "AB−"]]
DONATION_GAP_DAYS = 90


class Role(models.TextChoices):
    MEMBER = "member", "সদস্য"
    VOLUNTEER = "volunteer", "স্বেচ্ছাসেবক"
    CASHIER = "cashier", "ক্যাশিয়ার"
    ADMIN = "admin", "অ্যাডমিন"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, phone, role=Role.MEMBER, **extra):
        if not phone:
            raise ValueError("phone is required")
        user = self.model(phone=phone, role=role, **extra)
        user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, password=None, **extra):
        user = self.model(phone=phone, role=Role.ADMIN, is_staff=True, is_superuser=True, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    """Login identity. Members log in with phone + OTP; Django admin uses a password."""

    phone = models.CharField(max_length=11, unique=True)
    role = models.CharField(max_length=12, choices=Role.choices, default=Role.MEMBER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()
    USERNAME_FIELD = "phone"

    def __str__(self):
        return self.phone

    @property
    def is_committee(self):
        return self.role in {Role.VOLUNTEER, Role.CASHIER, Role.ADMIN}


class OTPCode(models.Model):
    phone = models.CharField(max_length=11, db_index=True)
    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts_left = models.PositiveSmallIntegerField(default=3)
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]


class Member(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "অপেক্ষমাণ"
        ACTIVE = "active", "সক্রিয়"
        INACTIVE = "inactive", "নিষ্ক্রিয়"
        REJECTED = "rejected", "বাতিল"

    class Residence(models.TextChoices):
        VILLAGE = "village", "গ্রামে"
        DHAKA = "dhaka", "ঢাকায়"
        DISTRICT = "district", "অন্য জেলায়"
        ABROAD = "abroad", "প্রবাসে"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="member")
    member_no = models.CharField(max_length=12, unique=True, null=True, blank=True)
    name = models.CharField(max_length=120)
    father_name = models.CharField(max_length=120, blank=True)
    photo = models.ImageField(upload_to="members/", blank=True)
    dob = models.DateField(null=True, blank=True)
    para = models.ForeignKey("core.ListItem", null=True, blank=True, on_delete=models.SET_NULL, related_name="members")
    residence = models.CharField(max_length=10, choices=Residence.choices, default=Residence.VILLAGE)
    country = models.CharField(max_length=60, blank=True)
    profession = models.CharField(max_length=80, blank=True)
    education = models.CharField(max_length=80, blank=True)
    blood_group = models.CharField(max_length=4, choices=BLOOD_GROUPS, blank=True)
    wants_to_donate = models.BooleanField(default=False)
    available = models.BooleanField(default=True, help_text="Donor toggled 'এখন রক্ত দিতে পারব'")
    last_donation_date = models.DateField(null=True, blank=True)
    show_phone = models.BooleanField(default=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    joined_at = models.DateField(default=date.today)

    class Meta:
        ordering = ["member_no"]

    def __str__(self):
        return f"{self.member_no} {self.name}"

    def save(self, *args, **kwargs):
        # Numbers are given on approval; pending/rejected applicants keep NULL (unique allows many NULLs).
        if not self.member_no:
            self.member_no = self.next_member_no() if self.status in (self.Status.ACTIVE, self.Status.INACTIVE) else None
        super().save(*args, **kwargs)

    @staticmethod
    def next_member_no():
        last = Member.objects.exclude(member_no__isnull=True).exclude(member_no="").order_by("-member_no").values_list("member_no", flat=True).first()
        n = int(last.split("-")[1]) + 1 if last else 1
        return f"SAJS-{n:04d}"

    @property
    def phone(self):
        return self.user.phone

    @property
    def donor_ready(self) -> bool:
        """Ready = wants to donate, toggled available, and last donation ≥ 90 days ago."""
        if not (self.wants_to_donate and self.available and self.blood_group):
            return False
        if not self.last_donation_date:
            return True
        return self.last_donation_date <= timezone.localdate() - timedelta(days=DONATION_GAP_DAYS)
