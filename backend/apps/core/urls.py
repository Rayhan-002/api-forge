from django.urls import path

from .views import DashboardSummaryView, ExecuteView

app_name = "core"

urlpatterns = [
    path("execute/", ExecuteView.as_view(), name="execute"),
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
]
