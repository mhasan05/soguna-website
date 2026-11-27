# সগুনা আদর্শ যুব সমাজ — Backend API

Django 5.2 + Django REST Framework, implementing the PRD data model and API (`../Soguna-Adorsho-Jubo-Somaj-PRD.pdf`, §9).

## Run locally

```bash
python -m venv .venv
.venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # set OTP_DEV_CODE=123456 for easy local logins
python manage.py migrate
python manage.py seed           # sample content from the designs (--reset to reload)
python manage.py runserver 8000
python manage.py test apps.core # API tests
```

API root: `http://localhost:8000/api/` · Django admin (superuser): `/django-admin/` (`python manage.py createsuperuser`).

### Demo logins after `seed` (phone → role)
| Phone | Role | Who |
|---|---|---|
| 01711111111 | admin | মোঃ রফিকুল ইসলাম (সভাপতি) |
| 01733333333 | cashier | মোঃ জাহিদুল আলম (কোষাধ্যক্ষ) |
| 01744444444 | volunteer | মোঃ রুবেল মিয়া |
| 01712345678 | member | মোঃ রাকিব হাসান |

OTP codes are printed in the server log (`SMS_BACKEND=console`), or are always `OTP_DEV_CODE` when DEBUG is on.

## Apps
| App | Models |
|---|---|
| `accounts` | `User` (phone login, role), `OTPCode`, `Member` |
| `core` | `ListItem` (পাড়া, categories, খাত, পেশা, পদবি), `SiteSetting`, `HeroSlide`, `EmergencyContact`, `CommitteeTerm/Position`, `AuditLog` |
| `content` | `Notice`, `Event`, `EventRSVP`, `Album`, `Photo`, `Video` |
| `finance` | `DuesSetting`, `DuesPayment`, `Donation`, `Income`, `Expense` |
| `community` | `BloodRequest`, `AidRequest`, `AidDocument`, `ServiceProvider`, `JobPost`, `ContactMessage` |

## Rules enforced server-side
- **OTP**: 6 digits, valid 5 min, max 5 requests / number / hour, 3 attempts per code; JWT (access 12 h, refresh 60 days).
- **Privacy**: visitors get donor *counts* only; members-only notice bodies and finance transactions require login; a member's phone is hidden unless `show_phone`; aid documents are admin-only; aid applicant names hidden unless allowed.
- **Roles**: admin = everything; cashier = dues, finance, reports; volunteer = members (no roles/delete), notice drafts (need approval), events, gallery.
- **Money**: no stored balance — income = verified dues + verified donations + non-void income; expense = non-void expenses. Financial entries are never deleted, only voided with a reason. Expenses need a voucher photo.
- **Donor readiness**: "প্রস্তুত" = wants to donate, available, last donation ≥ 90 days ago.
- **Audit log**: every admin create/update/delete/void/approve/export is written to `AuditLog` (user, action, model, before/after).
- **Uploads**: images converted to WebP (Pillow), max 10 MB.

## Endpoints (all under `/api/`)
Public: `site/`, `committee/`, `notices/`, `notices/<slug>/`, `events/?status=`, `events/<slug>/`, `albums/`, `albums/<slug>/`, `videos/`, `donors/?blood_group=&para=`, `finance/summary/`, `aid-funds/`, `services/`, `jobs/`, `members/verify/<no>/`, POST `blood-requests/`, `contact/`, `donations/`, `members/register/`.
Auth: POST `auth/otp/send/`, `auth/otp/verify/`, `auth/refresh/`.
Member: `me/` (GET/PATCH), `me/photo/`, `me/donor/`, `me/donor/donated-today/`, `members/`, `events/<slug>/rsvp/`, `finance/transactions/`, `dues/me/`, POST `dues/`, `aid-requests/` (GET/POST).
Admin (`admin/…`): `dashboard/`, `members/` (+`approve`, `reject`, `export`, `import_csv`), `lists/` (+`reorder`), `settings/` (PATCH; files `logo`, `logo_dark`, `logo_icon`, or `<field>_reset=1`), `hero-slides/` (POST `images`, +`reorder`), `emergency/`, `committee/terms|positions/`, `notices/` (+`publish`), `events/` (+`attendees`), `albums/` (+`upload`, `photos/<id>`), `videos/`, `dues/`, `dues/setting|verify|cash|remind/`, `finance/entries/` (+`<id>/void/`), `reports/`, `reports/<finance|dues>.csv`, `aid/` (+`approve`, `reject`, `complete`), `services/`, `jobs/`, `messages/`.

Errors use one shape: `{"detail": "...", "code": "...", "fields": {"field": "message"}}`.

## Production (Hostinger VPS, per PRD)
1. PostgreSQL: set `DATABASE_URL`; `DJANGO_DEBUG=false`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `PUBLIC_API_ORIGIN`.
2. `python manage.py migrate && python manage.py collectstatic`
3. `gunicorn config.wsgi -w 3 -b 127.0.0.1:8000` behind Nginx (SSL); Nginx serves `/media/` and `/static/` directly.
4. SMS: set `SMS_BACKEND=bulksmsbd`, `SMS_API_KEY`, `SMS_SENDER_ID` (or add another provider in `apps/core/sms.py`).
5. Daily `pg_dump` backup, keep 7 days (PRD §10).
