# Handoff: সগুনা আদর্শ যুব সমাজ — Website (Public, Member, Admin)

## Overview
Mobile-first Bangla website for সগুনা আদর্শ যুব সমাজ (Soguna, Belkuchi, Sirajganj, Bangladesh) — a 122-member village youth organisation. It replaces WhatsApp as the permanent record for: identity & committee, notices, blood-donor search, events & gallery, transparent dues/donation accounting, aid requests and a village service directory. Covers every screen in the PRD's screen list (public 13, member 11, admin 13) plus empty / error / loading states.

Primary users: villagers of all ages (many elderly, low digital literacy), slow 3G mobile internet, expatriates (প্রবাসী) on phones.

## About the Design Files
The files in `designs/` are **design references built in HTML** — prototypes showing intended look, copy and behaviour. They are **not production code**. Recreate them in the target stack from the PRD: **Next.js (App Router) + Tailwind CSS** (later PWA), backed by Django REST. Use Tailwind tokens/components; do not copy the inline styles verbatim.

To view: open any `*.dc.html` in a browser (keep `support.js` beside them). The `* Canvas.dc.html` files lay every page out side-by-side at 360px and 1280px with ids (e.g. `23a` = Dashboard mobile). Most pages accept a `mode` prop (`mobile`/`desktop`/`auto`) and some a state prop (listed below) — the canvases show each.

## Fidelity
**High-fidelity.** Final colours, type, spacing, copy and interactions. Recreate pixel-close. All sample data (names, numbers, phone `০১৭XX-XXXXXX`, founding year ২০১৮, dues ৳২০০) is placeholder — replace with real data from the API. Photos are Wikimedia Commons stand-ins (see Assets); logo "স" circle is a placeholder.

---

## Design Tokens

### Colour
| Token | Hex | Use |
|---|---|---|
| green-600 (primary) | `#15803D` | Header bg, primary buttons, links, active states, positive numbers |
| green-900 (dark) | `#14532D` | Footer, hero overlay, admin sidebar, member card |
| green-50 | `#F0FDF4` | Tinted cards, icon circles, selected option bg |
| green-100 border | `#DCEFE1` | Borders on green-50 surfaces |
| green-200 | `#86C49B` | Dashed upload borders, "filled" OTP boxes |
| success pill bg | `#DCFCE7` | "প্রস্তুত", "পরিশোধিত", "সক্রিয়" |
| red-600 (blood/urgent ONLY) | `#DC2626` | Blood features, urgent notices, destructive confirm |
| red-700 text | `#B91C1C` / `#991B1B` | Red text on light red |
| red-50 | `#FEF2F2` | Blood section bg, error banners |
| red-200 | `#FBD5D5` / `#FCA5A5` | Red borders |
| gold-600 (highlight) | `#D97706` | Fund progress bars, "দান করুন" hero button, menu badges, CTA "সদস্য হোন" |
| gold-700 text | `#B45309` / `#92400E` | Gold text |
| gold-50 | `#FEF3C7` / `#FFFBEB` | Pending/yellow pills, payment instruction boxes |
| gold-200 border | `#F5C97A` / `#FCD9A0` | Pinned / pending-attention cards |
| bg | `#FAFAF7` | Page background (warm off-white) |
| admin bg | `#F4F3EE` | Admin main area |
| surface | `#FFFFFF` | Cards |
| border | `#E7E5DF` | Card borders; dividers `#F0EEE8`; inputs `#D6D3CB` |
| segmented track | `#EFEDE6` | Tab/segmented control background |
| text-strong | `#1C1917` | Headings |
| text | `#44403C` / `#292524` | Long body copy |
| text-muted | `#57534E` | Secondary text (min 4.5:1 on bg) |
| neutral pill | `#F5F5F4` bg / `#44403C` fg | Neutral badges |
| done (aid) | `#E0E7FF` bg / `#3730A3` fg | "সম্পন্ন" aid status |
| toast | `#1C1917` | Toast bg; undo button `#FCD34D` |

Rule: red is reserved for blood + urgent + destructive. Gold for money progress & highlights. Everything else green/neutral.

### Handloom stripe (brand motif)
`repeating-linear-gradient(90deg, #14532D 0 16px, #D97706 16px 20px, #15803D 20px 30px, #FAFAF7 30px 32px)` — 6px band under header, above footer, top of CTA banner & member card (5px in admin sidebar, 8px in CTA). Evokes Belkuchi গামছা/তাঁত.

### Typography
Font: **Hind Siliguri** (400/500/600/700), fallback `Noto Sans Bengali`, sans-serif. Monospace (`ui-monospace, Menlo`) only for member numbers (SAJS-0045), Transaction IDs, file-type chips.
- Body: 16px min, line-height 1.6 (long-form notice body 18px / 1.75)
- Card title: 19–20px / 600
- Section H2: `clamp(24px, 2.4cqw, 32px)` / 700 / 1.3 → 24px mobile, 32px desktop
- Page H1: `clamp(28px, 3.4cqw, 42px)` / 700
- Hero H1: `clamp(30px, 4.6cqw, 56px)` / 700 / 1.3
- Stat numbers: `clamp(32px, 3.4cqw, 44px)` / 700
- Labels: 16–17px / 600; helper 15px muted; pills 14px / 600
- **All numerals in Bangla digits** (০–৯), dates like "২৬ নভেম্বর ২০২৬", money "৳১,৫০,০০০" (Indian grouping). Inputs must accept both Bangla & ASCII digits and normalise.

### Spacing / sizing
- Content max-width **1200px**; side padding `clamp(16px, 3.5cqw, 40px)` (16 mobile → 40 desktop)
- Section vertical rhythm `clamp(40px, 5.5cqw, 72px)`
- Card padding 16–18px (22–28 for forms); grid gaps 10–16px
- **Touch targets ≥ 48px** (primary submit 56px, inputs 52–56px, OTP boxes 56–64px)
- Responsive grids use `repeat(auto-fit, minmax(min(Npx,100%),1fr))` — e.g. notices N=300–360, stats N=150, blood groups `minmax(68px,1fr)` (4 cols mobile, 8 desktop)
- Breakpoint for nav switch: **900px** container width (bottom nav + hamburger below; top nav above)

### Radius / shadow
- Cards 12px; large panels/form shells 16px; member card 20px; buttons/inputs 10–12px; pills 999px
- Card shadow `0 1px 2px rgba(28,25,23,.04)`; menus `0 8px 24px rgba(28,25,23,.12)`; bottom nav `0 -4px 16px rgba(28,25,23,.06)`; member card `0 16px 40px rgba(20,83,45,.25)`

### Icons
Lucide line icons, 2px stroke, 18–24px (droplet, phone, map-pin, calendar, clock, bell, user, users, lock, house, message-circle for WhatsApp, heart, book-open, flag, moon, life-buoy, upload, download, share-2, search, camera, check, alert-triangle, wifi-off).

---

## Global Components

**SiteHeader** (`SiteHeader.dc.html`) — sticky, bg `#15803D`, white text, stripe below.
- Left: 44px logo circle (bg `#14532D`, 2px `#D97706` border, "স") + name 17/700 + "বেলকুচি, সিরাজগঞ্জ" 13px.
- Desktop: links আমাদের কথা · কমিটি · নোটিশ · কার্যক্রম · গ্যালারি · দান ও হিসাব · যোগাযোগ (active = 700 + 2px gold underline), then red "রক্ত খুঁজুন" (48px) and outline "লগইন".
- Mobile: red "রক্ত" button + 48px hamburger → dropdown panel under header (white, links 18px, full-width "লগইন" 52px).

**BottomNav** (mobile only, sticky bottom, 68px, white): হোম · নোটিশ · রক্ত (always red icon/label) · কার্যক্রম · আমি. Active = `#15803D` + 700. "আমি" → login if logged-out, dashboard if logged-in.

**SiteFooter** — bg `#14532D`, stripe on top; 3-col auto-fit: org + address + phone + WhatsApp/Facebook buttons; quick links 2-col grid; emergency "৯৯৯" white button + link. Bottom bar © + "রাজনৈতিকভাবে নিরপেক্ষ".

**Buttons**: primary green filled; secondary 1.5px green outline on white; blood red filled/outlined; gold for donate/join CTAs. Icon + text together. Disabled: bg `#86A894` (green) or `#E7E5DF` text `#78716C`.

**Inputs**: 52–56px, radius 10, 1.5px `#D6D3CB`, label above (16–17/600), helper below 15px. Error: 2px `#DC2626` border, bg `#FFFBFB`, message 15px `#B91C1C`/600. Valid: 2px green + "✓ ঠিক আছে".

**Toggle switch**: 60×34 track (on `#15803D`, off `#D6D3CB`), 28px white knob.

**Segmented tabs**: track `#EFEDE6` r12 p4; active white pill + shadow, `#14532D` 700. **Chip tabs** (notice categories): 48px pills, active filled green; horizontally scrollable on mobile.

**Pills/badges**: notice categories — সভা green-50/green, ইভেন্ট gold-50/`#92400E`, জরুরি & শোকসংবাদ red-50/`#B91C1C`, সরকারি ঘোষণা & অন্যান্য neutral. Dues — পরিশোধিত green, বাকি red, যাচাইয়ের অপেক্ষায় gold.

**Progress bar** (funds): 12px, track `#F3EFE6`, fill `#D97706`.

---

## Screens

### Public (Phase 1) — `Site Canvas.dc.html`
1. **Home** (`Home`) — 10 sections in order: (1) Hero full-bleed photo + green gradient overlay `rgba(20,83,45,.35→.88)`, location pill, H1 "আমরা সগুনার তরুণ, আমরা এক সাথে", 1-line, buttons "সদস্য হোন" (white) + "দান করুন" (gold); min-height clamp(460–580). (2) সংখ্যায় আমরা — 4 stat cards on green-50 band. (3) Urgent notice — red-bordered `#FEF2F2` card with "জরুরি · শোকসংবাদ" pill, WhatsApp share + বিস্তারিত. Hidden if no urgent notice. (4) Latest 3 notices + "সব দেখুন". (5) 2 upcoming events: date block (72px, green-50) + title/time/place + "আমি আসছি" (toggles → outline "আপনি আসছেন" and count+1). (6) Blood quick search: 8 group buttons 60px red-outlined → `/blood?group=`. (7) আমাদের কাজ — 3 photo cards. (8) চলমান সাহায্য তহবিল (Phase 3; hide if none). (9) Committee preview 3 cards. (10) Join CTA green banner with photo + stripe + gold "সদস্য হোন". Props: `showUrgent`, `showAidFund`.
2. **About** — page hero photo; history + timeline cards; 6 goal cards with icons (blood = red tint, disaster = gold tint); village section photo + places list + Google Maps embed; constitution accordion (60px rows, +/− toggle, "খসড়া" pill).
3. **Committee** — segmented বর্তমান/পূর্ববর্তী; cards ordered by position order: 96px photo, role (green 600), name, পাড়া; **phone/call button only for সভাপতি & সাধারণ সম্পাদক**; উপদেষ্টা পরিষদ separate green-50 cards.
4. **Notices** — chip tabs সব · জরুরি · শোকসংবাদ · সভা · ইভেন্ট · সরকারি ঘোষণা · অন্যান্য (filter). Pinned first (gold border + pin label). Members-only: lock row "সদস্য-কেবল নোটিশ — লগইন করে পড়ুন" instead of preview. Empty state when filter is empty.
5. **Notice detail** — back link, badge+date+author, H1, image 16:9, body 18/1.75, PDF attachment row, share grid: WhatsApp (filled) + Facebook (outline). "আরও নোটিশ" list. Needs OG tags.
6. **Blood donors** — red-50 header with 8 selectable group buttons + পাড়া select. Prop `viewAs`:
   - visitor: count card "B+ রক্তদাতা ১৪ জন / এখন দিতে পারবেন ৯ জন", login prompt, **urgent request form** (রোগীর নাম, গ্রুপ (prefilled), কত ব্যাগ, হাসপাতাল, ফোন) → success message.
   - member: donor cards (initial avatar red-50, name, পাড়া · শেষ রক্তদান date, pill "প্রস্তুত" green or "৩ মাস হয়নি" grey, Call + WhatsApp 48px). Ready sorted first. **Ready = last donation ≥ 90 days ago** (computed server-side).
7. **Contact** — emergency cards (999 red filled, others white) tap-to-call; org contact buttons, map, message form → success.

### Public (Phase 2–3) — `Site Canvas Phase 2.dc.html`
8. **Events** — segmented আসন্ন/সম্পন্ন; cards 16:9 cover + category pill on image, title, date, place, meta (upcoming: "৪২ জন আসছেন" green; completed: beneficiaries + cost).
9. **Event detail** (prop `status`) — cover hero with status pill (আসন্ন gold / সম্পন্ন grey). Upcoming: green-50 panel with live countdown (দিন/ঘণ্টা/মিনিট), "আমি আসছি" 56px + count, volunteer checkbox. Completed: report stats (উপকৃত, খরচ, স্বেচ্ছাসেবক) + link to accounts, photo grid.
10. **Gallery** — album cards (1 big + 2 small mosaic), "সগুনার স্মৃতি" gold border; album → square photo grid → viewer (dark, prev/next 56px, counter "৩ / ৮", close). YouTube card.
11. **Donate** — purpose radio cards (সাধারণ তহবিল / নির্দিষ্ট ইভেন্ট / নির্দিষ্ট আবেদন), amount quick buttons ৳১০০/৫০০/১০০০/অন্যান্য (custom input), name, phone, "নাম গোপন রাখুন", bKash/Nagad segmented + gold instruction box with org number + copy, Transaction ID → success "যাচাইয়ের অপেক্ষায়".
12. **Finance (ফান্ডের হিসাব)** (prop `viewAs`) — totals (income green, expense gold, balance dark green card), 6-month grouped bar chart (green income / gold expense, 200px), expense-by-category bars, transactions: visitor = lock + login; member = list with +/− icon, amount colour, "ভাউচার" link.
13. **Aid & services** (Phase 3) — chip tabs: সাহায্য তহবিল (cards with photo, type pill, deadline, progress, donate), গ্রামের সেবা (category chips filter; cards with 52px call button), চাকরি ও শিক্ষা (news cards).

### Member panel — `Member Canvas.dc.html`
14. **Login** (prop `step` phone|otp) — desktop shows photo panel left. Phone: "+৮৮" prefix box + 60px input (2px green), "কোড পাঠান". OTP: 6 display boxes 64px (active box green border), real input below (`autocomplete="one-time-code"`), resend countdown. OTP valid 5 min; max 5 requests/hour/number.
15. **Register** (prop `step` step1|step2|step3|pending) — 3-segment progress bar with labels. Step1: photo, নাম, বাবার নাম, ফোন, জন্ম তারিখ. Step2: পাড়া (select from admin list), বর্তমানে থাকেন 2×2 (গ্রামে/ঢাকায়/অন্য জেলায়/প্রবাসে → country input), পেশা, শিক্ষা. Step3: blood group 4×2, "আমি জানি না", donate toggle, last donation date. Back + Next (56px). Pending: clock icon, 3-step status timeline, SMS on approval.
16. **Dashboard** (prop `dues` paid|due) — green welcome card with stripe, avatar, name, SAJS no (mono), status pill; 4 quick cards; 5 quick actions (চাঁদা দিন, রক্তদাতা খুঁজুন, সদস্য কার্ড, সাহায্যের আবেদন, সদস্য তালিকা); donor block (if donor): last donation, "এখন রক্ত দিতে পারব" toggle, "আজ রক্ত দিয়েছি" (sets last_donation_date = today; auto-unavailable 90 days).
17. **Profile** — view rows ↔ edit inputs (phone locked), privacy toggle "আমার ফোন নম্বর সদস্যরা দেখবে" (default on), sticky save bar.
18. **Member card** (prop `view` card|verify) — dark-green card: logo header, stripe, photo 92×112, name, SAJS no in gold, blood/পাড়া/since grid, QR (encodes `/verify/SAJS-0045`), "সক্রিয় সদস্য" pill. Download-as-image + share. Verify page: check icon, "এই ব্যক্তি সগুনা আদর্শ যুব সমাজের সক্রিয় সদস্য".
19. **Dues** — 12-month grid (green paid / red due / gold pending / dashed future); tapping due/future months multi-selects (turns filled green) → summary box auto-totals (count × monthly amount); method bKash / Nagad / নগদ ক্যাশিয়ারকে; TrxID; history with রসিদ.
20. **Member directory** — search 56px, 4 filter selects (border turns green when active), cards → profile with Call/WhatsApp, or "ফোন নম্বর গোপন" if `show_phone=false`.
21. **Aid apply** — type 2×2, কার জন্য, বিবরণ, টাকা (৳ prefix), document upload (dashed) + file row, "পাবলিকে নাম দেখানো যাবে" (default off); my applications with status pills অপেক্ষমাণ/অনুমোদিত/বাতিল/সম্পন্ন.

### Admin panel — `Admin Canvas.dc.html` (`Admin.dc.html`, props `role` admin|cashier|volunteer, `page`)
Shell: desktop 264px dark-green sidebar (logo, stripe, menu 46px items, active `rgba(255,255,255,.16)`, gold count badges, user footer); mobile sticky dark-green bar + hamburger dropdown. Main bg `#F4F3EE`. Header row: "ফেজ N" + H1 + "সাইট দেখুন →".
**Role menus**: admin = all; cashier = dashboard, চাঁদা, আয়-ব্যয়, রিপোর্ট; volunteer = dashboard, সদস্য, নোটিশ (drafts), ইভেন্ট, গ্যালারি.
Pages: ড্যাশবোর্ড (5 clickable stat cards, dues progress, activity log) · সদস্য ব্যবস্থাপনা (new applications approve/reject, add/CSV import/Excel export, table: no, name (inline edit), পাড়া select, role select, status toggle, edit/delete) · কমিটি (session select, positions with ▲▼ reorder + member select) · নোটিশ (form: title, category, body, attachment, পাবলিক/সদস্য-কেবল, urgent pin → published → WhatsApp share; volunteer drafts approval; published list with edit/delete) · জরুরি নম্বর (inline editable rows, reorder, add, delete) · ইভেন্ট (cards: edit/delete, report action) · গ্যালারি (album select, bulk upload with WebP sizes, YouTube link) · চাঁদা (monthly amount, defaulters + SMS reminder, TrxID verification মিলেছে/মেলেনি, member×month grid ✓ ! ?) · আয়-ব্যয় (আয়/ব্যয় segmented, খাত from lists, amount, date, link to event/aid, voucher photo required for expense; entries: edit, **বাতিল with mandatory reason — never delete**) · সাহায্যের আবেদন (docs, set target + deadline + show-name, approve/reject) · সেবা ডিরেক্টরি (category select, publish toggle, edit/delete) · রিপোর্ট (PDF cards, members by পাড়া bars, blood-group bars) · **তালিকা ও ক্যাটাগরি** (CRUD for পাড়া, নোটিশ ক্যাটাগরি, ইভেন্ট ক্যাটাগরি, আয়ের খাত, ব্যয়ের খাত, সেবার ক্যাটাগরি, পেশা, কমিটির পদবি — add (dup check), inline rename, ▲▼ order, delete with usage warning "মুছলে সেগুলো 'অন্যান্য'-তে চলে যাবে") · সেটিংস (org info, payment numbers, social, SMS, hero image/text, link to lists).
**Delete pattern**: red-bordered sticky confirm bar "…মুছে ফেলবেন?" + context warning → "হ্যাঁ, মুছুন" → toast "মুছে ফেলা হয়েছে · অডিট লগে লেখা হলো" with "ফিরিয়ে আনুন" (7s). Members: recommend নিষ্ক্রিয় over delete.

### States — `States.dc.html`
- **L1** list skeleton (pulse 1.4s ease-in-out, blocks `#EFEDE6`/`#E7E5DF`) · **L2** image placeholder keeps aspect ratio, text first · **L3** button loading: spinner 20px 3px border (top transparent, 0.8s linear) + "…হচ্ছে" label, button disabled · **L4** first page load skeleton.
- **Empty N1–N9**: dashed card, 68px tinted circle icon, 18/600 title, 16 muted line, optional CTA. Copy per screen in file.
- **Errors**: E1 wrong OTP (red boxes, attempts left) · E2 OTP expired / rate-limited with countdown · E3 inline validation (summary banner "২টি ঘর ঠিক করতে হবে" + per-field) · E4 offline (top banner "ইন্টারনেট নেই — আগে দেখা তথ্য দেখাচ্ছে", retry, call 999) · E5 submit failed — **form values preserved**, retry + phone fallback · E6 payment TrxID mismatch · E7 members-only / session expired (return to same page after login) · E8 upload too large (max 10 MB) + progress · E9 404 / 500.
- **T1 toasts**: dark `#1C1917`, success ✓ `#86EFAC`, undo `#FCD34D`, error `#7F1D1D`; above bottom nav, 7s.

---

## Interactions & Behaviour
- Layout switches at 900px; all grids auto-fit; no horizontal page scroll at 360px (only tables/chip rows scroll inside their box).
- Header sticky top; bottom nav sticky bottom (mobile); admin header sticky.
- No hover-only affordances; hover = slightly darker bg. Focus: visible 2px green outline (add in implementation).
- RSVP, availability toggle, "আজ রক্ত দিয়েছি", dues selection, approve/verify buttons are optimistic with toast on failure.
- Blood search requires no approval; visitor sees counts only (`GET /donors?blood_group=&para=` returns counts for anonymous).
- Members-only content shows lock state; after login redirect back.
- WhatsApp share: `https://wa.me/?text=<title>%0A<url>`; every notice/event has OG image + title.
- Images: WebP, lazy, fixed aspect ratios (16:9 covers, 16:10 cards, 1:1 gallery thumbs). Home ≤ 500 KB, < 3s on 3G.
- Bangla digits everywhere in UI; normalise input digits before API.
- Financial records: no delete, void with reason; all CRUD writes AuditLog (user, action, model, before/after).

## State Management (per PRD data model)
Auth (phone, OTP step, JWT, role) · current member (status, dues status, donor flags) · lists (Para, categories, khat, professions, positions — fetched once, cached, used by every select/filter) · notices (filter category, pinned, visibility) · events (tab, RSVP per event) · donors (group, para, viewAs) · dues (selected months, method, trx) · admin collections with edit-draft map, confirm dialog, toast + undo snapshot.

## Assets
- Font: Hind Siliguri (Google Fonts).
- Photos (placeholders, Wikimedia Commons via `Special:FilePath`, CC licences — **replace with organisation's own photos** or add attribution): Village_river.jpg, Bangladesh_Village_Landscape_(36143248590).jpg, Paddy_Field_Of_A_Village.jpg, A_Farmer_walking_in_paddy_field.jpg, Iftar_beguni.JPG, Sariakandi_Char_Land_Flood_Affected_Bangladesh.jpg, A_conversation_session_of_village_people.jpg, A_smiling_farmer_on_a_winter_morning.jpg, Busy_farmer_at_winter_morning.jpg, Village_children_in_Bangladesh.jpg, Football_in_the_village_of_Bangladesh.jpg, My_Village_Town_School_Tree_outside_view.jpg, Flood_in_Bangladesh.jpg, Canal_Of_Village.jpg, River_side_road.jpg, Our_village.jpg, Natural_view_of_Village,_Bangladesh.jpg, A_Fisherman_at_Sunset_Time_in_Village_River.jpg, Paddy_field.jpg, Hand_weaving_loom.JPG, Crop_field.jpg, Namaj_Time_in_Bangladesh.jpg, Winter_Fair.jpg, My_beautiful_village_field.jpg.
- QR on member card: placeholder uses api.qrserver.com — generate QR locally in production.
- Logo: placeholder "স" in circle. PRD suggests green circle with joined hands + paddy sheaf.
- Map: Google Maps embed (Belkuchi, Sirajganj).
- Committee/member photos: initials placeholders until real photos.

## Files (`designs/`)
Canvases: `Site Canvas.dc.html` (public P1), `Site Canvas Phase 2.dc.html` (public P2/P3), `Member Canvas.dc.html`, `Admin Canvas.dc.html`, `States.dc.html`.
Shared: `SiteHeader.dc.html`, `SiteFooter.dc.html`, `BottomNav.dc.html`.
Pages: `Home`, `About`, `Committee`, `Notices`, `NoticeDetail`, `Blood`, `Contact`, `Events`, `EventDetail`, `Gallery`, `Donate`, `Finance`, `Aid`, `Login`, `Register`, `Dashboard`, `Profile`, `MemberCard`, `Dues`, `Members`, `AidApply`, `Admin` (`.dc.html`). `support.js` is the viewer runtime (not for production).

## Open questions (from PRD — affect copy)
Monthly dues amount & expat rate; membership eligibility (age, women members); whose name the bKash/Nagad number is in; founding year & real committee list; real photos, logo, পাড়া list and emergency numbers.
