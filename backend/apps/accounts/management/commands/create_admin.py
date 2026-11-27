"""python manage.py create_admin --phone 017XXXXXXXX --name "নাম"

Creates (or promotes) an active member with the admin role, so the first committee
member can log in to /admin with phone + OTP. Safe to run again.
"""

from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import Member, Role, User
from apps.core.utils import normalise_phone


class Command(BaseCommand):
    help = "Create or promote an admin member (phone login)."

    def add_arguments(self, parser):
        parser.add_argument("--phone", required=True)
        parser.add_argument("--name", default="অ্যাডমিন")

    def handle(self, *args, phone, name, **opts):
        p = normalise_phone(phone)
        if not p:
            raise CommandError("১১ সংখ্যার মোবাইল নম্বর দিন (যেমন 017XXXXXXXX)")
        user, created = User.objects.get_or_create(phone=p, defaults={"role": Role.ADMIN})
        if not created and user.role != Role.ADMIN:
            user.role = Role.ADMIN
            user.save(update_fields=["role"])
        member = getattr(user, "member", None)
        if member is None:
            member = Member.objects.create(user=user, name=name, status=Member.Status.ACTIVE)
        elif member.status != Member.Status.ACTIVE:
            member.status = Member.Status.ACTIVE
            member.save()
        self.stdout.write(self.style.SUCCESS(f"Admin ready: {member.name} · {p} · {member.member_no}"))
