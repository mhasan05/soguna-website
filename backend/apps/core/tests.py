from django.core.management import call_command
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import Member, OTPCode
from apps.core.models import AuditLog
from apps.finance.models import Expense, VerifyStatus

ADMIN, CASHIER, VOLUNTEER, MEMBER = "01711111111", "01733333333", "01744444444", "01712345678"


@override_settings(OTP_DEV_CODE="123456", SMS_BACKEND="console")
class ApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed", verbosity=0)

    def login(self, phone):
        self.client.credentials()
        r = self.client.post("/api/auth/otp/send/", {"phone": phone}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        r = self.client.post("/api/auth/otp/verify/", {"phone": phone, "code": "১২৩৪৫৬"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + r.data["access"])
        return r.data

    # ── Auth ──
    def test_otp_wrong_code_counts_attempts(self):
        self.client.post("/api/auth/otp/send/", {"phone": "+8801712345678"}, format="json")
        r = self.client.post("/api/auth/otp/verify/", {"phone": MEMBER, "code": "000000"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["code"], "otp_invalid")
        self.assertEqual(r.data["attempts_left"], 2)

    def test_otp_rate_limit(self):
        for _ in range(5):
            OTPCode.objects.create(phone="01799999999", code_hash="x", expires_at="2099-01-01T00:00Z")
        r = self.client.post("/api/auth/otp/send/", {"phone": "01799999999"}, format="json")
        self.assertEqual(r.status_code, 429)
        self.assertEqual(r.data["code"], "otp_rate_limited")

    def test_pending_member_cannot_login(self):
        self.client.post("/api/auth/otp/send/", {"phone": "01788888801"}, format="json")
        r = self.client.post("/api/auth/otp/verify/", {"phone": "01788888801", "code": "123456"}, format="json")
        self.assertEqual(r.data["code"], "pending")

    def test_register_creates_pending(self):
        r = self.client.post("/api/members/register/", {"name": "নতুন", "phone": "০১৯১১১১১১১১", "para": "নদীপাড়া"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Member.objects.get(user__phone="01911111111").status, "pending")

    # ── Privacy ──
    def test_visitor_sees_donor_counts_only(self):
        r = self.client.get("/api/donors/", {"blood_group": "B+"})
        self.assertGreater(r.data["total"], 0)
        self.assertIsNone(r.data["donors"])
        self.login(MEMBER)
        r = self.client.get("/api/donors/", {"blood_group": "B+"})
        self.assertEqual(len(r.data["donors"]), r.data["total"])

    def test_members_only_notice_locked_for_visitor(self):
        r = self.client.get("/api/notices/october-accounts-minutes/")
        self.assertTrue(r.data["locked"])
        self.assertEqual(r.data["body"], [])
        self.login(MEMBER)
        r = self.client.get("/api/notices/october-accounts-minutes/")
        self.assertFalse(r.data["locked"])

    def test_directory_requires_login(self):
        self.assertEqual(self.client.get("/api/members/").status_code, 401)

    # ── Roles ──
    def test_role_permissions(self):
        self.login(MEMBER)
        self.assertEqual(self.client.get("/api/admin/dashboard/").status_code, 403)
        self.login(CASHIER)
        self.assertEqual(self.client.get("/api/admin/dues/").status_code, 200)
        self.assertEqual(self.client.get("/api/admin/members/").status_code, 403)
        self.login(VOLUNTEER)
        r = self.client.post("/api/admin/notices/", {"title": "খসড়া", "category": "সভা", "body": "লেখা"}, format="json")
        self.assertEqual(r.data["status"], "pending")
        self.assertEqual(self.client.get("/api/admin/dues/").status_code, 403)

    # ── Money ──
    def test_dues_submit_and_verify(self):
        self.login(MEMBER)
        r = self.client.get("/api/dues/me/")
        self.assertEqual(r.data["months"][8]["status"], "due")  # September
        r = self.client.post("/api/dues/", {"months": [9], "method": "bkash", "trx_id": "ABCD1234EF"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.login(CASHIER)
        pending = [p for p in self.client.get("/api/admin/dues/").data["pending"] if p["trx_id"] == "ABCD1234EF"][0]
        r = self.client.post("/api/admin/dues/verify/", {"kind": "dues", "id": pending["id"], "ok": True}, format="json")
        self.assertEqual(r.data["status"], VerifyStatus.VERIFIED)

    def test_entries_void_not_delete(self):
        self.login(CASHIER)
        e = Expense.objects.first()
        r = self.client.post(f"/api/admin/finance/entries/e{e.id}/void/", {}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.client.post(f"/api/admin/finance/entries/e{e.id}/void/", {"reason": "ভুল এন্ট্রি"}, format="json")
        self.assertTrue(r.data["is_void"])
        self.assertTrue(Expense.objects.filter(pk=e.pk).exists())
        self.assertTrue(AuditLog.objects.filter(action="void").exists())

    def test_expense_requires_voucher(self):
        self.login(CASHIER)
        r = self.client.post("/api/admin/finance/entries/", {"kind": "expense", "amount": 100, "date": "2026-11-01", "category": "শীতবস্ত্র"})
        self.assertEqual(r.status_code, 400)
        self.assertIn("voucher_image", r.data["fields"])

    def test_public_endpoints(self):
        for url in ["/api/site/", "/api/committee/", "/api/notices/", "/api/events/?status=upcoming", "/api/albums/", "/api/finance/summary/", "/api/aid-funds/", "/api/services/", "/api/jobs/", "/api/members/verify/SAJS-0005/"]:
            self.assertEqual(self.client.get(url).status_code, 200, url)
        s = self.client.get("/api/finance/summary/").data
        self.assertEqual(s["balance"], s["income"] - s["expense"])

    # ── Hero slideshow ──
    def test_hero_slides_upload_and_public(self):
        import io
        import tempfile

        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        def jpg(name):
            buf = io.BytesIO()
            Image.new("RGB", (1200, 600), (20, 120, 60)).save(buf, "JPEG")
            return SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")

        seeded = len(self.client.get("/api/site/").data["hero_slides"])
        self.assertGreater(seeded, 1)
        self.login(CASHIER)
        self.assertEqual(self.client.post("/api/admin/hero-slides/", {"images": [jpg("a.jpg")]}).status_code, 403)
        self.login(ADMIN)
        with tempfile.TemporaryDirectory() as tmp, override_settings(MEDIA_ROOT=tmp):
            r = self.client.post("/api/admin/hero-slides/", {"images": [jpg("a.jpg"), jpg("b.jpg")]})
            self.assertEqual(r.status_code, 201, r.data)
            self.assertEqual(len(r.data), 2)
            self.assertTrue(r.data[0]["image"].endswith(".webp"))
            ids = [s["id"] for s in self.client.get("/api/admin/hero-slides/").data]
            self.client.post("/api/admin/hero-slides/reorder/", {"ids": ids[::-1]}, format="json")
            slides = self.client.get("/api/site/").data["hero_slides"]
            self.assertEqual(len(slides), seeded + 2)
            self.assertEqual(slides[0]["id"], ids[-1])
            self.assertEqual(self.client.delete(f"/api/admin/hero-slides/{ids[-1]}/").status_code, 204)

    # ── Logos ──
    def test_logo_upload_and_reset(self):
        import io
        import tempfile

        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        buf = io.BytesIO()
        Image.new("RGBA", (800, 200), (0, 0, 0, 0)).save(buf, "PNG")
        png = SimpleUploadedFile("logo.png", buf.getvalue(), content_type="image/png")
        self.assertEqual(self.client.get("/api/site/").data["logo_dark"], "")
        self.login(ADMIN)
        with tempfile.TemporaryDirectory() as tmp, override_settings(MEDIA_ROOT=tmp):
            r = self.client.patch("/api/admin/settings/", {"logo_dark": png})
            self.assertEqual(r.status_code, 200, r.data)
            self.assertTrue(r.data["logo_dark"].endswith(".webp"))
            self.assertTrue(self.client.get("/api/site/").data["logo_dark"])
            r = self.client.patch("/api/admin/settings/", {"logo_dark_reset": "1"})
            self.assertEqual(r.data["logo_dark"], "")

    def test_otp_shown_on_screen_only_without_sms_gateway(self):
        with override_settings(OTP_SHOW_ON_SCREEN=True):
            r = self.client.post("/api/auth/otp/send/", {"phone": "01755555501"}, format="json")
            self.assertEqual(r.data.get("screen_code"), "123456")
        OTPCode.objects.all().delete()
        with override_settings(OTP_SHOW_ON_SCREEN=False):
            r = self.client.post("/api/auth/otp/send/", {"phone": "01755555502"}, format="json")
            self.assertNotIn("screen_code", r.data)
