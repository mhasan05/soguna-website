from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts import admin_api as acc_admin
from apps.accounts import views as acc
from apps.community import admin_api as com_admin
from apps.community import views as com
from apps.content import admin_api as con_admin
from apps.content import views as con
from apps.core import admin_api as core_admin
from apps.core import views as core
from apps.finance import admin_api as fin_admin
from apps.finance import views as fin

router = DefaultRouter(trailing_slash=True)
router.register("members", acc_admin.AdminMemberViewSet, basename="admin-members")
router.register("lists", core_admin.ListItemViewSet, basename="admin-lists")
router.register("emergency", core_admin.EmergencyViewSet, basename="admin-emergency")
router.register("hero-slides", core_admin.HeroSlideViewSet, basename="admin-hero-slides")
router.register("committee/positions", core_admin.PositionViewSet, basename="admin-positions")
router.register("committee/terms", core_admin.TermViewSet, basename="admin-terms")
router.register("notices", con_admin.AdminNoticeViewSet, basename="admin-notices")
router.register("events", con_admin.AdminEventViewSet, basename="admin-events")
router.register("albums", con_admin.AdminAlbumViewSet, basename="admin-albums")
router.register("videos", con_admin.AdminVideoViewSet, basename="admin-videos")
router.register("aid", com_admin.AdminAidViewSet, basename="admin-aid")
router.register("services", com_admin.AdminServiceViewSet, basename="admin-services")
router.register("jobs", com_admin.AdminJobViewSet, basename="admin-jobs")
router.register("messages", com_admin.AdminMessageViewSet, basename="admin-messages")

admin_api = [
    path("dashboard/", acc_admin.DashboardView.as_view()),
    path("settings/", core_admin.SettingsView.as_view()),
    path("dues/", fin_admin.DuesOverview.as_view()),
    path("dues/setting/", fin_admin.DuesSettingView.as_view()),
    path("dues/verify/", fin_admin.VerifyPayment.as_view()),
    path("dues/cash/", fin_admin.CashDues.as_view()),
    path("dues/remind/", fin_admin.DuesReminder.as_view()),
    path("finance/entries/", fin_admin.EntriesView.as_view()),
    path("finance/entries/<str:eid>/", fin_admin.EntryDetailView.as_view()),
    path("finance/entries/<str:eid>/void/", fin_admin.EntryDetailView.as_view()),
    path("reports/", fin_admin.ReportsView.as_view()),
    path("reports/<str:kind>.csv", fin_admin.ReportDownload.as_view()),
    path("", include(router.urls)),
]

api = [
    path("health/", lambda r: JsonResponse({"ok": True})),
    # Auth (PRD: POST /auth/otp/send, /auth/otp/verify)
    path("auth/otp/send/", acc.SendOTPView.as_view()),
    path("auth/otp/verify/", acc.VerifyOTPView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("members/register/", acc.RegisterView.as_view()),
    path("members/verify/<str:member_no>/", acc.VerifyMemberView.as_view()),
    path("members/", acc.DirectoryView.as_view()),
    path("me/", acc.MeView.as_view()),
    path("me/photo/", acc.MePhotoView.as_view()),
    path("me/donor/", acc.DonorAvailabilityView.as_view()),
    path("me/donor/donated-today/", acc.DonatedTodayView.as_view()),
    path("donors/", acc.DonorsView.as_view()),
    # Public content
    path("site/", core.SiteView.as_view()),
    path("committee/", core.CommitteeView.as_view()),
    path("notices/", con.NoticeList.as_view()),
    path("notices/<str:slug>/", con.NoticeDetail.as_view()),
    path("events/", con.EventList.as_view()),
    path("events/<str:slug>/", con.EventDetail.as_view()),
    path("events/<str:slug>/rsvp/", con.EventRSVPView.as_view()),
    path("albums/", con.AlbumList.as_view()),
    path("albums/<str:slug>/", con.AlbumDetail.as_view()),
    path("videos/", con.VideoList.as_view()),
    # Community
    path("blood-requests/", com.BloodRequestCreate.as_view()),
    path("contact/", com.ContactCreate.as_view()),
    path("aid-funds/", com.AidFundList.as_view()),
    path("aid-requests/", com.MyAidRequests.as_view()),
    path("services/", com.ServiceList.as_view()),
    path("jobs/", com.JobList.as_view()),
    # Money
    path("donations/", fin.DonationCreateView.as_view()),
    path("finance/summary/", fin.FinanceSummaryView.as_view()),
    path("finance/transactions/", fin.TransactionsView.as_view()),
    path("dues/me/", fin.MyDuesView.as_view()),
    path("dues/", fin.MyDuesView.as_view()),
    path("admin/", include(admin_api)),
]

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/", include(api)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
