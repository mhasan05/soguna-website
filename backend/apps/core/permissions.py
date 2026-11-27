from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import Member, Role


def active_member(user):
    if not (user and user.is_authenticated):
        return None
    m = getattr(user, "member", None)
    if m and m.status == Member.Status.ACTIVE:
        return m
    return None


def has_role(user, *roles) -> bool:
    return bool(user and user.is_authenticated and (user.role in roles or user.is_superuser))


class IsActiveMember(BasePermission):
    message = "এটি শুধু সদস্যদের জন্য"

    def has_permission(self, request, view):
        return active_member(request.user) is not None or has_role(request.user, Role.ADMIN)


def RoleRequired(*roles, read_roles=None):
    """Permission class factory: e.g. RoleRequired('admin', 'cashier')."""
    read_roles = read_roles or roles

    class _Perm(BasePermission):
        message = "এই কাজ আপনার রোলের জন্য নয়"

        def has_permission(self, request, view):
            allowed = read_roles if request.method in SAFE_METHODS else roles
            return has_role(request.user, Role.ADMIN, *allowed)

    _Perm.__name__ = f"RoleRequired_{'_'.join(roles)}"
    return _Perm


IsAdmin = RoleRequired(Role.ADMIN)
IsCashier = RoleRequired(Role.CASHIER)
IsVolunteer = RoleRequired(Role.VOLUNTEER)
IsCommittee = RoleRequired(Role.VOLUNTEER, Role.CASHIER)
