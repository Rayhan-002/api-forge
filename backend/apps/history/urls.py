from django.urls import path

from .views import HistoryClearView, HistoryDetailView, HistoryListView

app_name = "history"

urlpatterns = [
    path("history/", HistoryListView.as_view(), name="list"),
    path("history/clear/", HistoryClearView.as_view(), name="clear"),
    path("history/<uuid:pk>/", HistoryDetailView.as_view(), name="detail"),
]
