from django.contrib import admin

from .models import Member, OTPCode, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ["phone", "role", "is_active", "is_staff", "last_login"]
    list_filter = ["role", "is_active"]
    search_fields = ["phone"]
    exclude = ["password"]


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ["member_no", "name", "para", "blood_group", "status"]
    list_filter = ["status", "para", "blood_group", "residence"]
    search_fields = ["name", "member_no", "user__phone"]


@admin.register(OTPCode)
class OTPAdmin(admin.ModelAdmin):
    list_display = ["phone", "created_at", "expires_at", "attempts_left", "used"]
    exclude = ["code_hash"]
