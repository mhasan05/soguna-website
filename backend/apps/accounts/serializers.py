from rest_framework import serializers

from apps.core.models import ListItem
from apps.core.utils import check_upload, media_url, require_phone, to_webp

from .models import Member, User


class MemberSelfSerializer(serializers.ModelSerializer):
    """The logged-in member's own full profile."""

    phone = serializers.CharField(source="user.phone", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)
    para = serializers.CharField(source="para.name", read_only=True, default="")
    para_id = serializers.PrimaryKeyRelatedField(source="para", queryset=ListItem.objects.filter(kind="para"), allow_null=True, required=False)
    photo = serializers.SerializerMethodField()
    residence_label = serializers.CharField(source="get_residence_display", read_only=True)
    donor_ready = serializers.BooleanField(read_only=True)
    since = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = [
            "id", "member_no", "name", "father_name", "phone", "role", "photo", "dob", "para", "para_id",
            "residence", "residence_label", "country", "profession", "education", "blood_group",
            "wants_to_donate", "available", "last_donation_date", "show_phone", "status", "since", "donor_ready",
        ]
        read_only_fields = ["id", "member_no", "status"]

    def get_photo(self, m):
        return media_url(m.photo)

    def get_since(self, m):
        return m.joined_at.year


class DirectoryMemberSerializer(serializers.ModelSerializer):
    para = serializers.CharField(source="para.name", default="")
    residence_label = serializers.CharField(source="get_residence_display")
    phone = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    since = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = ["id", "member_no", "name", "para", "profession", "blood_group", "residence", "residence_label", "country", "phone", "show_phone", "photo", "since"]

    def get_phone(self, m):
        viewer = self.context["request"].user
        if m.show_phone or getattr(viewer, "is_committee", False):
            return m.user.phone
        return None

    def get_photo(self, m):
        return media_url(m.photo)

    def get_since(self, m):
        return m.joined_at.year


class RegisterSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(write_only=True)
    para_id = serializers.PrimaryKeyRelatedField(source="para", queryset=ListItem.objects.filter(kind="para"), required=False, allow_null=True)
    para = serializers.CharField(write_only=True, required=False, allow_blank=True)
    photo = serializers.ImageField(required=False)

    class Meta:
        model = Member
        fields = ["name", "father_name", "phone", "dob", "para", "para_id", "residence", "country", "profession", "education", "blood_group", "wants_to_donate", "last_donation_date", "photo"]
        extra_kwargs = {"name": {"error_messages": {"blank": "নাম লিখুন", "required": "নাম লিখুন"}}}

    def validate_phone(self, value):
        phone = require_phone(value)
        u = User.objects.filter(phone=phone).first()
        if u and hasattr(u, "member"):
            raise serializers.ValidationError("এই নম্বরে আগেই আবেদন করা হয়েছে — লগইন করুন")
        return phone

    def validate(self, attrs):
        name = attrs.pop("para", None)
        if name and not attrs.get("para"):
            attrs["para"] = ListItem.objects.filter(kind="para", name=name).first()
        if not attrs.get("para"):
            raise serializers.ValidationError({"para": "পাড়া বাছাই করুন"})
        if attrs.get("residence") == Member.Residence.ABROAD and not attrs.get("country"):
            raise serializers.ValidationError({"country": "দেশের নাম লিখুন"})
        return attrs

    def create(self, data):
        phone = data.pop("phone")
        photo = data.pop("photo", None)
        user, _ = User.objects.get_or_create(phone=phone)
        member = Member(user=user, status=Member.Status.PENDING, **data)
        if photo:
            check_upload(photo, field="photo")
            member.photo.save("x.webp", to_webp(photo, 600), save=False)
        member.save()
        return member


def para_by_name(name: str | None):
    return ListItem.objects.filter(kind="para", name=name).first() if name else None
