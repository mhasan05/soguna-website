from django.contrib import admin

from .models import AuditLog, CommitteePosition, CommitteeTerm, EmergencyContact, ListItem, SiteSetting

admin.site.site_header = "সগুনা আদর্শ যুব সমাজ — সিস্টেম অ্যাডমিন"
admin.site.register([ListItem, SiteSetting, EmergencyContact, CommitteeTerm, CommitteePosition])


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "user", "action", "model", "object_id", "summary"]
    list_filter = ["action", "model"]
    search_fields = ["summary"]

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
