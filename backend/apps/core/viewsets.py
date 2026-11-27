from rest_framework import viewsets

from .utils import audit, snapshot


class AuditedModelViewSet(viewsets.ModelViewSet):
    """Every create / update / delete writes an AuditLog row (user, action, model, before/after)."""

    pagination_class = None
    audit_label = "name"

    def _label(self, obj):
        return str(getattr(obj, self.audit_label, "") or obj)

    def perform_create(self, serializer):
        obj = serializer.save()
        audit(self.request.user, "create", obj, summary=f"যোগ: {self._label(obj)}")

    def perform_update(self, serializer):
        before = snapshot(serializer.instance)
        obj = serializer.save()
        audit(self.request.user, "update", obj, before=before, summary=f"এডিট: {self._label(obj)}")

    def perform_destroy(self, instance):
        before = snapshot(instance)
        label, pk, model = self._label(instance), instance.pk, instance._meta.label
        instance.delete()
        audit(self.request.user, "delete", None, before=before, model=model, object_id=pk, summary=f"মুছে ফেলা: {label}")
