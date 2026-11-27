"""
python manage.py seed [--reset]

Loads the placeholder content from the design handoff so the site has something to show.
Demo logins (OTP code printed in the server log, or OTP_DEV_CODE in DEBUG):
  01711111111  admin      (মোঃ রফিকুল ইসলাম — সভাপতি)
  01733333333  cashier    (মোঃ জাহিদুল আলম — কোষাধ্যক্ষ)
  01744444444  volunteer  (মোঃ রুবেল মিয়া)
  01712345678  member     (মোঃ রাকিব হাসান)
"""

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Member, Role, User
from apps.community.models import AidRequest, JobPost, ServiceProvider
from apps.content.models import Album, Event, Notice, Photo, Video
from apps.core.models import CommitteePosition, CommitteeTerm, EmergencyContact, HeroSlide, ListItem, SiteSetting
from apps.finance.models import Donation, DuesPayment, DuesSetting, Expense, Income, VerifyStatus

TZ = ZoneInfo("Asia/Dhaka")


def F(name, w=800):
    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{name}?width={w}"


def dt(y, m, d, h=10, mi=0):
    return datetime(y, m, d, h, mi, tzinfo=TZ)


LISTS = {
    "para": ["উত্তরপাড়া", "দক্ষিণপাড়া", "মধ্যপাড়া", "পূর্বপাড়া", "পশ্চিমপাড়া", "নদীপাড়া"],
    "noticeCat": ["জরুরি", "শোকসংবাদ", "সভা", "ইভেন্ট", "সরকারি ঘোষণা", "অন্যান্য"],
    "eventCat": ["খেলাধুলা", "ইফতার মাহফিল", "শীতবস্ত্র বিতরণ", "বৃক্ষরোপণ", "রক্তদান ক্যাম্প", "সভা", "দুর্যোগে সহায়তা", "কৃষি সহায়তা"],
    "incomeCat": ["মাসিক চাঁদা", "দান", "স্পন্সর"],
    "expenseCat": ["ত্রাণ ও দুর্যোগ", "শীতবস্ত্র", "ইফতার ও ধর্মীয়", "কৃষি সহায়তা", "খেলাধুলা", "চিকিৎসা সহায়তা", "প্রশাসনিক (SMS, সাইট)"],
    "serviceCat": ["ইলেকট্রিশিয়ান", "দর্জি", "তাঁতি", "মিস্ত্রি", "দোকান", "টিউটর", "ডাক্তার"],
    "profession": ["তাঁতি", "কৃষক", "শিক্ষক", "শিক্ষার্থী", "ব্যবসায়ী", "চাকরিজীবী", "প্রবাসী শ্রমিক"],
    "position": ["সভাপতি", "সহ-সভাপতি", "সাধারণ সম্পাদক", "যুগ্ম সাধারণ সম্পাদক", "কোষাধ্যক্ষ", "সাংগঠনিক সম্পাদক", "রক্তদান বিষয়ক সম্পাদক", "ক্রীড়া সম্পাদক", "ধর্ম বিষয়ক সম্পাদক", "প্রচার সম্পাদক"],
}

# name, phone, para, profession, blood, residence, role, joined, extra
CORE_MEMBERS = [
    ("মোঃ রফিকুল ইসলাম", "01711111111", "মধ্যপাড়া", "শিক্ষক", "O+", "village", Role.ADMIN, 2018),
    ("মোঃ সাইফুল হাসান", "01722222222", "উত্তরপাড়া", "ব্যবসায়ী", "A+", "village", Role.ADMIN, 2018),
    ("মোঃ জাহিদুল আলম", "01733333333", "দক্ষিণপাড়া", "ব্যবসায়ী", "AB+", "village", Role.CASHIER, 2018),
    ("মোঃ রুবেল মিয়া", "01744444444", "নদীপাড়া", "তাঁতি", "O−", "village", Role.VOLUNTEER, 2020),
    ("মোঃ রাকিব হাসান", "01712345678", "নদীপাড়া", "চাকরিজীবী", "B+", "dhaka", Role.MEMBER, 2023),
    ("আব্দুল মালেক", "01755555501", "পশ্চিমপাড়া", "কৃষক", "A−", "village", Role.MEMBER, 2018),
    ("মোঃ আরিফ হোসেন", "01755555502", "দক্ষিণপাড়া", "চাকরিজীবী", "B+", "dhaka", Role.MEMBER, 2019),
    ("মোঃ নাজমুল হক", "01755555503", "পূর্বপাড়া", "চাকরিজীবী", "A+", "dhaka", Role.MEMBER, 2019),
    ("মোঃ সোহেল রানা", "01755555504", "মধ্যপাড়া", "তাঁতি", "B+", "village", Role.MEMBER, 2018),
    ("হাফেজ মোঃ ইউসুফ আলী", "01755555505", "উত্তরপাড়া", "শিক্ষক", "O+", "village", Role.MEMBER, 2020),
    ("মোঃ তানভীর আহমেদ", "01755555506", "পশ্চিমপাড়া", "শিক্ষার্থী", "B+", "village", Role.MEMBER, 2022),
    ("আব্দুল্লাহ আল মামুন", "01755555507", "পশ্চিমপাড়া", "প্রবাসী শ্রমিক", "O+", "abroad", Role.MEMBER, 2019),
    ("মোঃ শামীম হোসেন", "01755555508", "দক্ষিণপাড়া", "কৃষক", "AB+", "village", Role.MEMBER, 2021),
    ("মোঃ ফারুক আহমেদ", "01755555509", "পূর্বপাড়া", "শিক্ষার্থী", "A−", "district", Role.MEMBER, 2024),
    ("মোঃ জসিম উদ্দিন", "01755555510", "উত্তরপাড়া", "প্রবাসী শ্রমিক", "B−", "abroad", Role.MEMBER, 2019),
    ("মোঃ হাবিবুর রহমান", "01755555511", "দক্ষিণপাড়া", "ব্যবসায়ী", "O+", "village", Role.MEMBER, 2020),
    ("মোঃ কামাল হোসেন", "01755555512", "পূর্বপাড়া", "কৃষক", "O+", "village", Role.MEMBER, 2019),
]
DONOR_NAMES = ["মোঃ আলমগীর কবির", "মোঃ মিজানুর রহমান", "মোঃ সাগর আলী", "মোঃ নয়ন শেখ", "মোঃ রাশেদ খান", "মোঃ ইমরান হোসেন", "মোঃ রাজু আহমেদ", "মোঃ মাসুদ রানা", "মোঃ বাবু মিয়া", "মোঃ শাকিল হোসেন"]
DONOR_COUNTS = {"A+": 9, "A−": 1, "B+": 9, "B−": 1, "O+": 14, "O−": 1, "AB+": 3, "AB−": 1}
DAYS_AGO = [20, 45, 120, 200, 95, 60, 310, 150, 30, 180, 400, 100, 75, 130]


class Command(BaseCommand):
    help = "Load the sample content from the design handoff"

    def _basics(self):
        """Production starter data: only what the forms need. Each part is skipped if it already exists."""
        if not ListItem.objects.exists():
            for kind, names in LISTS.items():
                for i, n in enumerate(names):
                    ListItem.objects.create(kind=kind, name=n, order=i)
        if not EmergencyContact.objects.exists():
            EmergencyContact.objects.create(title="জাতীয় জরুরি সেবা", phone="999", order=0)
        if not DuesSetting.objects.exists():
            DuesSetting.objects.create(monthly_amount=200, effective_from=date.today().replace(day=1))
        if not HeroSlide.objects.exists():
            for i, (f, alt) in enumerate([("Village_river.jpg", "গ্রামের নদী"), ("Bangladesh_Village_Landscape_(36143248590).jpg", "সবুজ গ্রামের দৃশ্য")]):
                HeroSlide.objects.create(image_url=F(f, 1920), alt=alt, order=i)
        if not CommitteeTerm.objects.exists():
            y = date.today().year
            CommitteeTerm.objects.create(name=f"{y}–{y + 1}", start_date=date(y, 1, 1), is_current=True)
        self.stdout.write(self.style.SUCCESS("Basics ready (lists, emergency number, dues, hero photos, committee term)."))

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete existing content first")
        parser.add_argument("--basics", action="store_true", help="Only lists, emergency numbers, dues amount and hero photos (no demo people/content)")

    @transaction.atomic
    def handle(self, *args, reset=False, basics=False, **opts):
        if basics:
            self._basics()
            return
        if reset:
            for model in (Donation, DuesPayment, Income, Expense, Photo, Album, Video, Notice, Event, AidRequest, ServiceProvider, JobPost, CommitteePosition, CommitteeTerm, EmergencyContact, HeroSlide, Member, ListItem, DuesSetting):
                model.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
        if Member.objects.exists():
            self.stdout.write(self.style.WARNING("Data already present — use --reset to reload."))
            return

        L = {}
        for kind, names in LISTS.items():
            for i, n in enumerate(names):
                L[(kind, n)] = ListItem.objects.create(kind=kind, name=n, order=i)
        para = lambda n: L.get(("para", n))  # noqa: E731

        s = SiteSetting.load()
        s.hero_image_url = F("Village_river.jpg", 1400)
        s.families_helped = 57
        s.save()
        for i, (f, alt) in enumerate([
            ("Village_river.jpg", "সগুনার পাশ দিয়ে বয়ে যাওয়া গ্রামের নদী"),
            ("A_conversation_session_of_village_people.jpg", "গ্রামের মানুষের আড্ডা"),
            ("Bangladesh_Village_Landscape_(36143248590).jpg", "সবুজ গ্রামের দৃশ্য"),
            ("A_Fisherman_at_Sunset_Time_in_Village_River.jpg", "সন্ধ্যায় নদীতে জেলে"),
        ]):
            HeroSlide.objects.create(image_url=F(f, 1920), alt=alt, order=i)

        for i, (t, p) in enumerate([("জাতীয় জরুরি সেবা", "999"), ("অ্যাম্বুলেন্স", "017XXXXXXXX"), ("বেলকুচি উপজেলা স্বাস্থ্য কমপ্লেক্স", "017XXXXXXXX"), ("বেলকুচি থানা", "017XXXXXXXX"), ("ফায়ার সার্ভিস", "017XXXXXXXX"), ("পল্লী বিদ্যুৎ (অভিযোগ)", "017XXXXXXXX"), ("ইউনিয়ন পরিষদ", "017XXXXXXXX"), ("গ্রামের ডাক্তার", "017XXXXXXXX")]):
            EmergencyContact.objects.create(title=t, phone=p, order=i)

        # ── Members ──
        M = {}
        for name, phone, pa, job, blood, res, role, joined in CORE_MEMBERS:
            u = User.objects.create_user(phone=phone, role=role)
            M[name] = Member.objects.create(
                user=u, name=name, para=para(pa), profession=job, blood_group=blood, residence=res,
                country={"abroad": "সৌদি আরব"}.get(res, ""), status=Member.Status.ACTIVE, joined_at=date(joined, 1, 15),
                wants_to_donate=True, last_donation_date=date(2026, 8, 10) if name == "মোঃ রাকিব হাসান" else date(2026, 11, 26) - timedelta(days=DAYS_AGO[len(M) % 14]),
                show_phone=len(M) % 5 != 4,
            )
        rakib = M["মোঃ রাকিব হাসান"]
        rakib.father_name, rakib.profession, rakib.education, rakib.dob = "মোঃ আব্দুস সালাম", "গার্মেন্টস সুপারভাইজার", "স্নাতক", date(1998, 3, 14)
        rakib.save()

        n = 0
        paras = LISTS["para"]
        for gi, (group, count) in enumerate(DONOR_COUNTS.items()):
            for i in range(count):
                n += 1
                u = User.objects.create_user(phone=f"0176{n:07d}")
                Member.objects.create(
                    user=u, name=DONOR_NAMES[(i + gi * 3) % len(DONOR_NAMES)], para=para(paras[(i + gi) % 6]), profession=LISTS["profession"][(i + gi) % 7],
                    blood_group=group, wants_to_donate=True, status=Member.Status.ACTIVE, joined_at=date(2019 + n % 6, 3, 1),
                    last_donation_date=date(2026, 11, 26) - timedelta(days=DAYS_AGO[(i + gi * 3) % 14]), residence="village",
                )
        for name, phone, pa, job, blood, res in [("মোঃ আল আমিন", "01788888801", "নদীপাড়া", "তাঁতি", "O+", "village"), ("মোঃ সাকিব হোসেন", "01788888802", "উত্তরপাড়া", "শিক্ষার্থী", "B+", "village"), ("মোঃ মেহেদী হাসান", "01788888803", "দক্ষিণপাড়া", "প্রবাসী শ্রমিক", "A+", "abroad")]:
            Member.objects.create(user=User.objects.create_user(phone=phone), name=name, para=para(pa), profession=job, blood_group=blood, residence=res, country="মালয়েশিয়া" if res == "abroad" else "", status=Member.Status.PENDING)
        M["মোঃ কামাল হোসেন"].status = Member.Status.INACTIVE
        M["মোঃ কামাল হোসেন"].save()

        # ── Committee ──
        cur = CommitteeTerm.objects.create(name="২০২৬–২০২৭", start_date=date(2026, 1, 1), is_current=True)
        past = CommitteeTerm.objects.create(name="২০২৪–২০২৫", start_date=date(2024, 1, 1), end_date=date(2025, 12, 31))
        for i, (title, name) in enumerate([("সভাপতি", "মোঃ রফিকুল ইসলাম"), ("সাধারণ সম্পাদক", "মোঃ সাইফুল হাসান"), ("সহ-সভাপতি", "আব্দুল মালেক"), ("যুগ্ম সাধারণ সম্পাদক", "মোঃ আরিফ হোসেন"), ("কোষাধ্যক্ষ", "মোঃ জাহিদুল আলম"), ("সাংগঠনিক সম্পাদক", "মোঃ নাজমুল হক"), ("রক্তদান বিষয়ক সম্পাদক", "মোঃ সোহেল রানা"), ("ক্রীড়া সম্পাদক", "মোঃ রাকিব হাসান"), ("ধর্ম বিষয়ক সম্পাদক", "হাফেজ মোঃ ইউসুফ আলী"), ("প্রচার সম্পাদক", "মোঃ তানভীর আহমেদ")]):
            CommitteePosition.objects.create(term=cur, title=title, member=M[name], order=i, show_phone=title in ("সভাপতি", "সাধারণ সম্পাদক"))
        for i, (title, name, pa) in enumerate([("সভাপতি", "মোঃ আব্দুল হালিম", "উত্তরপাড়া"), ("সাধারণ সম্পাদক", "", ""), ("কোষাধ্যক্ষ", "মোঃ শাহিন আলম", "পূর্বপাড়া"), ("সাংগঠনিক সম্পাদক", "মোঃ মামুন মিয়া", "নদীপাড়া")]):
            CommitteePosition.objects.create(term=past, title=title, person_name=name, para_name=pa, member=M["মোঃ রফিকুল ইসলাম"] if not name else None, order=i)
        for i, (name, role) in enumerate([("আলহাজ্ব মোঃ আজিজুল হক", "প্রবীণ মুরুব্বি"), ("মাওলানা আব্দুর রহিম", "ইমাম, কেন্দ্রীয় জামে মসজিদ"), ("মোছাঃ ফাতেমা খাতুন", "প্রধান শিক্ষক, প্রাথমিক বিদ্যালয়"), ("মোঃ গোলাম মোস্তফা", "অবসরপ্রাপ্ত শিক্ষক")]):
            CommitteePosition.objects.create(term=cur, title=role, person_name=name, is_advisor=True, order=100 + i)

        # ── Notices ──
        nc = lambda n: L[("noticeCat", n)]  # noqa: E731
        Notice.objects.create(slug="abdul-karim-intekal", title="দক্ষিণপাড়ার মোঃ আব্দুল করিম ইন্তেকাল করেছেন", category=nc("শোকসংবাদ"), is_urgent=True, published_at=dt(2026, 11, 26, 6, 30), author_label="সাধারণ সম্পাদক",
                              highlight="দক্ষিণপাড়ার মোঃ আব্দুল করিম (৭২)", summary="আজ ভোরে ইন্তেকাল করেছেন (ইন্না লিল্লাহি ওয়া ইন্না ইলাইহি রাজিউন)। জানাজা বাদ আসর, বিকাল ৪টা ১৫ মিনিটে, সগুনা কেন্দ্রীয় জামে মসজিদ মাঠে।",
                              body="দক্ষিণপাড়ার মোঃ আব্দুল করিম (৭২) আজ ভোরে ইন্তেকাল করেছেন (ইন্না লিল্লাহি ওয়া ইন্না ইলাইহি রাজিউন)।\n\nজানাজা বাদ আসর, বিকাল ৪টা ১৫ মিনিটে, সগুনা কেন্দ্রীয় জামে মসজিদ মাঠে। সবাইকে জানাজায় শরিক হওয়ার অনুরোধ জানানো হচ্ছে।")
        Notice.objects.create(slug="december-general-meeting", title="ডিসেম্বর মাসের সাধারণ সভা", category=nc("সভা"), is_pinned=True, published_at=dt(2026, 11, 24), author_label="সাধারণ সম্পাদক",
                              body="আসসালামু আলাইকুম। আগামী শুক্রবার বাদ জুমা সগুনা বাজার ক্লাব ঘরে ডিসেম্বর মাসের সাধারণ সভা অনুষ্ঠিত হবে। শীতবস্ত্র বিতরণ ও চাঁদা আদায় নিয়ে আলোচনা হবে।\n\nআলোচ্য বিষয়: শীতবস্ত্র বিতরণের প্রস্তুতি, নভেম্বর মাসের চাঁদা আদায় ও আয়-ব্যয়ের হিসাব পর্যালোচনা।\n\nসকল সদস্যের উপস্থিতি একান্ত কাম্য।")
        Notice.objects.create(slug="o-negative-blood-needed", title="O− রক্ত দরকার — বেলকুচি উপজেলা স্বাস্থ্য কমপ্লেক্স", category=nc("জরুরি"), published_at=dt(2026, 11, 25, 14), author_label="রক্তদান বিষয়ক সম্পাদক",
                              body="প্রসূতি রোগীর জন্য ২ ব্যাগ O− রক্ত প্রয়োজন। বেলকুচি উপজেলা স্বাস্থ্য কমপ্লেক্সে ভর্তি।\n\nযারা দিতে পারবেন, দয়া করে রক্তদান বিষয়ক সম্পাদক মোঃ সোহেল রানার সাথে যোগাযোগ করুন।")
        Notice.objects.create(slug="winter-volunteers-needed", title="শীতবস্ত্র বিতরণের জন্য স্বেচ্ছাসেবক দরকার", category=nc("ইভেন্ট"), published_at=dt(2026, 11, 20, 9), author_label="সাধারণ সম্পাদক",
                              image_url=F("A_smiling_farmer_on_a_winter_morning.jpg", 1200), image_alt="শীতের সকালে গ্রামের একজন কৃষক",
                              body="প্রতি পাড়া থেকে ২ জন স্বেচ্ছাসেবক প্রয়োজন। আগামী ১৩ ডিসেম্বর ২০২৬, শনিবার সকাল ৯টায় সগুনা সরকারি প্রাথমিক বিদ্যালয় মাঠে আমাদের বার্ষিক শীতবস্ত্র বিতরণ হবে। এবার ৩০০ পরিবারের হাতে কম্বল ও শীতের কাপড় তুলে দেওয়ার লক্ষ্য।\n\nপ্রতিটি পাড়া থেকে ২ জন করে স্বেচ্ছাসেবক দরকার। কাজ: নিজের পাড়ার দুস্থ পরিবারের তালিকা যাচাই, বিতরণের দিন সারি সামলানো আর বয়স্কদের বাড়িতে কম্বল পৌঁছে দেওয়া।\n\nআগ্রহীরা ৫ ডিসেম্বরের মধ্যে সাংগঠনিক সম্পাদকের কাছে নাম দিন, অথবা ইভেন্ট পাতায় \"স্বেচ্ছাসেবক হব\" চাপুন।")
        Notice.objects.create(slug="typhoid-vaccine-campaign", title="শিশুদের টাইফয়েড টিকা ক্যাম্পেইন", category=nc("সরকারি ঘোষণা"), published_at=dt(2026, 11, 18, 9), author_label="প্রচার সম্পাদক",
                              body="বেলকুচি উপজেলা স্বাস্থ্য কমপ্লেক্সের উদ্যোগে সগুনা কমিউনিটি ক্লিনিকে ৯ মাস থেকে ১৫ বছরের শিশুদের বিনামূল্যে টাইফয়েড টিকা দেওয়া হবে।\n\nশিশুর জন্ম নিবন্ধনের কপি সঙ্গে আনুন। সময়: সকাল ৯টা থেকে দুপুর ২টা।")
        Notice.objects.create(slug="october-accounts-minutes", title="অক্টোবর মাসের আয়-ব্যয় পর্যালোচনা সভার কার্যবিবরণী", category=nc("সভা"), visibility=Notice.Visibility.MEMBERS, published_at=dt(2026, 11, 12, 18), author_label="সাধারণ সম্পাদক",
                              body="অক্টোবর মাসে মোট আয় ৳৩৯,৮০০ ও ব্যয় ৳১৮,৫০০। কোষাধ্যক্ষ সব ভাউচার উপস্থাপন করেছেন।\n\nসিদ্ধান্ত: শীতবস্ত্রের জন্য ৩০০ কম্বল অগ্রিম কেনা হবে। প্রবাসী সদস্যদের কাছে বিশেষ আবেদন পাঠানো হবে।")
        Notice.objects.create(slug="update-member-info", title="সদস্য তথ্য হালনাগাদের অনুরোধ", category=nc("অন্যান্য"), published_at=dt(2026, 11, 5), author_label="সাংগঠনিক সম্পাদক",
                              body="যাঁরা এখনও প্রোফাইলে রক্তের গ্রুপ ও পাড়া যোগ করেননি, পাড়ার স্বেচ্ছাসেবকের সাহায্য নিয়ে আজই পূরণ করুন।\n\nসঠিক তথ্য থাকলে জরুরি সময়ে রক্তদাতা খুঁজে পেতে সুবিধা হয়।")
        rubel = M["মোঃ রুবেল মিয়া"].user
        Notice.objects.create(title="নদীপাড়ার রাস্তা মেরামতে স্বেচ্ছাশ্রম", category=nc("ইভেন্ট"), status=Notice.Status.PENDING, created_by=rubel, body="আগামী শুক্রবার সকালে নদীপাড়ার কাঁচা রাস্তা মেরামতে স্বেচ্ছাশ্রম। কোদাল ও ঝুড়ি নিয়ে আসুন।", published_at=dt(2026, 11, 24))

        # ── Events ──
        ec = lambda n: L[("eventCat", n)]  # noqa: E731
        ev = {}
        for slug, cat, status, title, start, note, venue, cover, desc, going, vol, meta, report in [
            ("winter-clothes-2026", "শীতবস্ত্র বিতরণ", "upcoming", "শীতবস্ত্র বিতরণ ২০২৬", dt(2026, 12, 13, 9), "", "সগুনা সরকারি প্রাথমিক বিদ্যালয় মাঠ", "A_smiling_farmer_on_a_winter_morning.jpg",
             "এবার ৩০০ পরিবারের হাতে কম্বল ও শীতের কাপড় তুলে দেওয়ার লক্ষ্য। প্রতিটি পাড়ার স্বেচ্ছাসেবকেরা আগে থেকে দুস্থ পরিবারের তালিকা যাচাই করবেন। বয়স্ক ও অসুস্থদের কম্বল বাড়িতে পৌঁছে দেওয়া হবে।", 42, 9, "", None),
            ("blood-camp-2026", "রক্তদান ক্যাম্প", "upcoming", "স্বেচ্ছায় রক্তদান ক্যাম্প", dt(2026, 12, 27, 10), "সকাল ১০টা – বিকাল ৩টা", "সগুনা বাজার, ক্লাব ঘর", "Village_children_in_Bangladesh.jpg",
             "উপজেলা স্বাস্থ্য কমপ্লেক্সের সহযোগিতায় স্বেচ্ছায় রক্তদান ক্যাম্প। রক্তদাতাদের জন্য হালকা নাস্তা ও রক্তের গ্রুপ পরীক্ষার ব্যবস্থা থাকবে।", 28, 6, "", None),
            ("victory-day-football-2026", "খেলাধুলা", "upcoming", "বিজয় দিবস ফুটবল টুর্নামেন্ট", dt(2026, 12, 16, 14), "", "সগুনা স্কুল মাঠ", "Football_in_the_village_of_Bangladesh.jpg",
             "মহান বিজয় দিবস উপলক্ষে সগুনার পাড়াভিত্তিক ৮টি দলের নকআউট ফুটবল টুর্নামেন্ট। ফাইনাল শেষে পুরস্কার বিতরণ।", 0, 4, "৮টি দল নিবন্ধিত", None),
            ("annual-general-meeting-2027", "সভা", "upcoming", "বার্ষিক সাধারণ সভা", dt(2027, 1, 9, 13, 30), "বাদ জুমা", "সগুনা কেন্দ্রীয় জামে মসজিদ প্রাঙ্গণ", "A_conversation_session_of_village_people.jpg",
             "বছরের আয়-ব্যয়ের হিসাব উপস্থাপন, নতুন বছরের কর্মপরিকল্পনা ও কমিটির মেয়াদ নিয়ে আলোচনা।", 65, 5, "", None),
            ("jamuna-flood-relief-2026", "দুর্যোগে সহায়তা", "completed", "যমুনার বন্যায় ত্রাণ বিতরণ", dt(2026, 8, 18, 9), "", "নদীপাড়া ও চরাঞ্চল", "Sariakandi_Char_Land_Flood_Affected_Bangladesh.jpg",
             "যমুনার পানি বেড়ে নদীপাড়া ও চরের ১২০টি পরিবার ঘরছাড়া হয়। সদস্য ও প্রবাসীদের দানে চাল, ডাল, তেল, শুকনো খাবার, খাবার স্যালাইন আর ওষুধের প্যাকেট তৈরি করে নৌকায় করে পৌঁছে দেওয়া হয়।", 0, 0, "", (120, "পরিবার উপকৃত", 36)),
            ("aman-seed-distribution-2026", "কৃষি সহায়তা", "completed", "বর্গাচাষিদের মাঝে আমন ধানের বীজ বিতরণ", dt(2026, 7, 12), "", "সগুনা বাজার", "A_Farmer_walking_in_paddy_field.jpg",
             "সগুনার ৮৫ জন বর্গাচাষির মাঝে উন্নত জাতের আমন ধানের বীজ ও সার বিতরণ করা হয়।", 0, 0, "", (85, "জন কৃষক", 14)),
            ("iftar-mahfil-2026", "ইফতার মাহফিল", "completed", "গ্রামবাসীর জন্য ইফতার মাহফিল", dt(2026, 3, 20, 17, 30), "", "সগুনা কেন্দ্রীয় জামে মসজিদ", "Iftar_beguni.JPG",
             "রমজানে গ্রামবাসী, মাদ্রাসার ছাত্র ও এতিমদের নিয়ে ইফতার মাহফিল ও দোয়া।", 0, 0, "", (350, "জন অংশ নেন", 22)),
            ("winter-clothes-2025", "শীতবস্ত্র বিতরণ", "completed", "শীতবস্ত্র বিতরণ ২০২৫", dt(2025, 12, 14, 9), "", "সগুনা সরকারি প্রাথমিক বিদ্যালয় মাঠ", "Busy_farmer_at_winter_morning.jpg",
             "২৬০ দুস্থ পরিবারের মাঝে কম্বল ও শীতের কাপড় বিতরণ।", 0, 0, "", (260, "পরিবার উপকৃত", 30)),
        ]:
            e = Event.objects.create(slug=slug, category=ec(cat), status=status, title=title, start_at=start, time_note=note, venue=venue, cover_url=F(cover, 1400), description=desc, offline_going=going, offline_volunteers=vol, meta_note=meta)
            if report:
                e.beneficiaries_count, e.beneficiary_label, e.report_volunteers = report
                e.save()
            ev[slug] = e

        # ── Gallery ──
        for i, (slug, title, desc, memory, event, files) in enumerate([
            ("soguna-memories", "সগুনার স্মৃতি", "গ্রামের পুরনো ও প্রিয় ছবি", True, None, ["Village_river.jpg", "Our_village.jpg", "Natural_view_of_Village,_Bangladesh.jpg", "A_Fisherman_at_Sunset_Time_in_Village_River.jpg", "Canal_Of_Village.jpg", "Paddy_field.jpg", "River_side_road.jpg", "Hand_weaving_loom.JPG"]),
            ("flood-relief-2026", "যমুনার বন্যায় ত্রাণ বিতরণ", "আগস্ট ২০২৬", False, "jamuna-flood-relief-2026", ["Sariakandi_Char_Land_Flood_Affected_Bangladesh.jpg", "Flood_in_Bangladesh.jpg", "Canal_Of_Village.jpg", "A_conversation_session_of_village_people.jpg", "Village_river.jpg", "River_side_road.jpg"]),
            ("aman-seed-2026", "আমন বীজ বিতরণ", "জুলাই ২০২৬", False, "aman-seed-distribution-2026", ["A_Farmer_walking_in_paddy_field.jpg", "Paddy_Field_Of_A_Village.jpg", "Crop_field.jpg", "Paddy_field.jpg", "Bangladesh_Village_Landscape_(36143248590).jpg"]),
            ("iftar-2026", "ইফতার মাহফিল", "মার্চ ২০২৬", False, "iftar-mahfil-2026", ["Iftar_beguni.JPG", "Namaj_Time_in_Bangladesh.jpg", "A_conversation_session_of_village_people.jpg", "Our_village.jpg"]),
            ("victory-day-2025", "বিজয় দিবস টুর্নামেন্ট", "ডিসেম্বর ২০২৫", False, None, ["Football_in_the_village_of_Bangladesh.jpg", "Village_children_in_Bangladesh.jpg", "Winter_Fair.jpg", "My_beautiful_village_field.jpg"]),
            ("winter-2025", "শীতবস্ত্র বিতরণ ২০২৫", "ডিসেম্বর ২০২৫", False, "winter-clothes-2025", ["Busy_farmer_at_winter_morning.jpg", "A_smiling_farmer_on_a_winter_morning.jpg", "Village_children_in_Bangladesh.jpg", "Winter_Fair.jpg"]),
        ]):
            a = Album.objects.create(slug=slug, title=title, description=desc, is_memory=memory, event=ev.get(event), order=i)
            for j, f in enumerate(files):
                Photo.objects.create(album=a, image_url=F(f, 1600), order=j, size_kb=150)
        Video.objects.create(title="বিজয় দিবস টুর্নামেন্ট ২০২৫ — ফাইনাল", youtube_url="https://youtube.com/", thumbnail_url=F("Football_in_the_village_of_Bangladesh.jpg", 900), duration_label="১২ মিনিট")

        # ── Aid ──
        funds = {}
        for key, t, title, desc, img, need, raised, deadline in [
            ("kidney", "medical", "কিডনি রোগীর চিকিৎসা সহায়তা", "পশ্চিমপাড়ার এক পরিবারের প্রধান উপার্জনকারীর ডায়ালাইসিসের খরচ। আবেদনকারীর নাম গোপন রাখা হয়েছে।", "Village_river.jpg", 150000, 96500, date(2026, 12, 31)),
            ("student", "education", "মেধাবী শিক্ষার্থীর ভর্তি খরচ", "বিশ্ববিদ্যালয়ে ভর্তির সুযোগ পাওয়া সগুনার এক শিক্ষার্থীর ভর্তি ও প্রথম বছরের খরচ।", "My_Village_Town_School_Tree_outside_view.jpg", 40000, 18000, date(2026, 12, 15)),
            ("river", "disaster", "নদীভাঙনে ঘর হারানো পরিবারের ঘর মেরামত", "নদীপাড়ার একটি পরিবারের টিনের ঘর নতুন করে তোলার খরচ।", "Sariakandi_Char_Land_Flood_Affected_Bangladesh.jpg", 70000, 61000, date(2026, 12, 10)),
        ]:
            a = AidRequest.objects.create(type=t, beneficiary=title, description=desc, amount_needed=need, target_amount=need, target_date=deadline, status=AidRequest.Status.APPROVED, public_title=title, public_description=desc, image_url=F(img))
            funds[key] = (a, raised)
        AidRequest.objects.create(applicant=rakib, type="medical", beneficiary="আমার বাবা", description="বাবার চোখের ছানি অপারেশন — সিরাজগঞ্জ চক্ষু হাসপাতালে, আনুমানিক খরচ ৳৩০,০০০।", amount_needed=30000)
        AidRequest.objects.create(applicant=rakib, type="education", beneficiary="ছোট বোন", description="ছোট বোনের কলেজ ভর্তি", amount_needed=15000, target_amount=15000, status=AidRequest.Status.APPROVED, public_title="শিক্ষার্থীর কলেজ ভর্তি", public_description="সগুনার এক শিক্ষার্থীর কলেজে ভর্তির খরচ।", image_url=F("Village_children_in_Bangladesh.jpg"))
        AidRequest.objects.create(applicant=rakib, type="disaster", beneficiary="নিজের পরিবার", description="বন্যায় ঘরের ক্ষতি", amount_needed=8000, status=AidRequest.Status.DONE, note="৳৮,০০০ হস্তান্তর হয়েছে ২ সেপ্টেম্বর")

        # ── Money ──
        DuesSetting.objects.create(monthly_amount=200, effective_from=date(2026, 1, 1))
        cashier = M["মোঃ জাহিদুল আলম"].user
        V = VerifyStatus.VERIFIED

        def pay(member, months, method, status=V, trx="", when=None, batch=""):
            for mo in months:
                p = DuesPayment.objects.create(member=member, year=2026, month=mo, amount=200, method=method, trx_id=trx, status=status, batch=batch or f"{member.id}-{months[0]}", verified_by=cashier if status == V else None)
                DuesPayment.objects.filter(pk=p.pk).update(created_at=when or dt(2026, mo, 8))

        # Rakib: Jan–Aug paid, Sep due, Oct paid, Nov pending (matches the design)
        pay(rakib, [1, 2, 3, 4, 5, 6], "bkash", trx="8JK2L0QW11", when=dt(2026, 1, 8))
        pay(rakib, [7, 8], "cash", when=dt(2026, 7, 12))
        pay(rakib, [10], "nagad", trx="5TR77NNQ20", when=dt(2026, 10, 3))
        pay(rakib, [11], "bkash", VerifyStatus.PENDING, "9K7X2M4QPL", dt(2026, 11, 24), "rakib-nov")
        pay(M["মোঃ সোহেল রানা"], [1, 2, 3, 4, 5, 6, 7, 8, 9], "bkash", trx="3MM9KDF211", when=dt(2026, 1, 10))
        pay(M["মোঃ সোহেল রানা"], [10, 11], "nagad", VerifyStatus.PENDING, "71HQ3ZP0AA", dt(2026, 11, 23), "sohel-oct")
        others = [m for m in Member.objects.filter(status=Member.Status.ACTIVE).exclude(pk__in=[rakib.pk, M["মোঃ সোহেল রানা"].pk])]
        for i, m in enumerate(others):
            upto = 11 if i % 2 == 0 else (10 if i % 3 else 6)
            pay(m, list(range(1, upto + 1)), ["bkash", "nagad", "cash"][i % 3], trx=f"SEED{i:06d}" if i % 3 != 2 else "")

        for name, amount, purpose, when, status, trx in [
            ("", 25000, ev["winter-clothes-2026"], dt(2026, 11, 22), VerifyStatus.PENDING, "BKX55T09LM"),
            ("মোঃ কামরুল হাসান (ঢাকা)", 5000, None, dt(2026, 11, 18), V, "KMR5000A18"),
            ("প্রবাসী সদস্যবৃন্দ", 60000, ev["jamuna-flood-relief-2026"], dt(2026, 8, 12), V, "PRB60000AU"),
        ]:
            d = Donation.objects.create(donor_name=name, is_anonymous=not name, amount=amount, purpose="event" if purpose else "general", event=purpose, method="bkash", trx_id=trx, status=status, verified_by=cashier if status == V else None, phone="01700000000")
            Donation.objects.filter(pk=d.pk).update(created_at=when)
        for a, raised in funds.values():
            d = Donation.objects.create(donor_name="", is_anonymous=True, amount=raised, purpose="aid_request", aid_request=a, method="bkash", trx_id=f"AID{a.id:07d}", status=V, verified_by=cashier)
            Donation.objects.filter(pk=d.pk).update(created_at=dt(2026, 10, 20))

        xc = lambda n: L[("expenseCat", n)]  # noqa: E731
        ic = lambda n: L[("incomeCat", n)]  # noqa: E731
        for cat, amount, when, desc, event in [
            ("ত্রাণ ও দুর্যোগ", 84500, date(2026, 8, 18), "বন্যার ত্রাণ সামগ্রী (চাল, ডাল, তেল, ওষুধ)", "jamuna-flood-relief-2026"),
            ("ত্রাণ ও দুর্যোগ", 43900, date(2026, 6, 20), "নদীভাঙন কবলিত পরিবারে সহায়তা", None),
            ("শীতবস্ত্র", 18000, date(2026, 11, 20), "৩০০ কম্বল ক্রয় (অগ্রিম)", "winter-clothes-2026"),
            ("ইফতার ও ধর্মীয়", 41200, date(2026, 3, 20), "ইফতার মাহফিলের খাবার", "iftar-mahfil-2026"),
            ("কৃষি সহায়তা", 32000, date(2026, 7, 12), "আমন ধানের বীজ ও সার", "aman-seed-distribution-2026"),
            ("খেলাধুলা", 12800, date(2026, 9, 15), "টুর্নামেন্টের বল, জার্সি ও পুরস্কার", None),
            ("খেলাধুলা", 11830, date(2026, 10, 10), "মাঠ প্রস্তুত", None),
            ("চিকিৎসা সহায়তা", 5400, date(2026, 11, 5), "ডায়ালাইসিস খরচ হস্তান্তর", None),
            ("প্রশাসনিক (SMS, সাইট)", 1200, date(2026, 11, 10), "SMS প্যাকেজ (২০০০ SMS)", None),
            ("প্রশাসনিক (SMS, সাইট)", 6670, date(2026, 10, 2), "ডোমেইন ও সার্ভার", None),
        ]:
            Expense.objects.create(category=xc(cat), amount=amount, date=when, description=desc, event=ev.get(event) if event else None, created_by=cashier)
        Income.objects.create(category=ic("স্পন্সর"), amount=10000, date=date(2026, 11, 8), description="স্থানীয় ব্যবসায়ী স্পন্সর", created_by=cashier)
        Income.objects.create(category=ic("দান"), amount=5000, date=date(2026, 11, 17), description="দান — ভুল TrxID", created_by=cashier, is_void=True, void_reason="পুনরায় এন্ট্রি দেওয়া হয়েছে")

        # ── Services & jobs ──
        sc = lambda n: L[("serviceCat", n)]  # noqa: E731
        for cat, name, pa, ok in [("ইলেকট্রিশিয়ান", "মোঃ বাবলু মিয়া", "মধ্যপাড়া", True), ("দর্জি", "মোছাঃ সালমা খাতুন", "উত্তরপাড়া", True), ("তাঁতি", "মোঃ হারুন অর রশিদ", "পূর্বপাড়া", True), ("মিস্ত্রি", "মোঃ আনোয়ার হোসেন (রাজমিস্ত্রি)", "দক্ষিণপাড়া", True), ("দোকান", "মায়ের দোয়া স্টোর (মুদি)", "সগুনা বাজার", True), ("টিউটর", "মোঃ শরিফুল ইসলাম (গণিত, ৬–১০ম)", "পশ্চিমপাড়া", True), ("ডাক্তার", "ডা. মোঃ মাহবুব আলম (MBBS)", "সগুনা বাজার", True), ("তাঁতি", "মোঃ সিরাজুল ইসলাম", "নদীপাড়া", True), ("মিস্ত্রি", "মোঃ কালাম শেখ", "নদীপাড়া", False)]:
            ServiceProvider.objects.create(category=sc(cat), name=name, para=pa, phone="017XXXXXXXX", approved=ok)
        for kind, d, title, desc in [
            ("job", date(2026, 11, 23), "বেলকুচির তাঁত কারখানায় ১০ জন কারিগর নিয়োগ", "অভিজ্ঞ তাঁতি ও সহকারী। যোগাযোগ সাধারণ সম্পাদকের মাধ্যমে।"),
            ("scholarship", date(2026, 11, 19), "এসএসসি ২০২৬ উত্তীর্ণদের জন্য সংগঠনের বৃত্তি", "GPA ৫ পাওয়া দরিদ্র পরিবারের শিক্ষার্থীরা ১৫ ডিসেম্বরের মধ্যে আবেদন করুন।"),
            ("reception", date(2026, 11, 10), "মেধাবী শিক্ষার্থী সংবর্ধনা ২০২৬", "বিশ্ববিদ্যালয় ও মেডিকেলে চান্স পাওয়া সগুনার ৭ জন শিক্ষার্থীকে সংবর্ধনা দেওয়া হবে।"),
            ("job", date(2026, 11, 5), "সিরাজগঞ্জ শহরে বিক্রয় প্রতিনিধি", "এইচএসসি পাস, মোটরসাইকেল চালাতে জানেন এমন ২ জন।"),
        ]:
            JobPost.objects.create(kind=kind, published_at=d, title=title, description=desc)

        self.stdout.write(self.style.SUCCESS(f"Seeded {Member.objects.count()} members, {Notice.objects.count()} notices, {Event.objects.count()} events."))
