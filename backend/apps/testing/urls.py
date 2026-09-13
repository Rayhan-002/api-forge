from django.urls import path

from .views import SavedRequestTestsView, TestAssertionDetailView

app_name = "testing"

urlpatterns = [
    path("requests/<uuid:request_id>/tests/", SavedRequestTestsView.as_view(), name="list"),
    path("tests/<uuid:pk>/", TestAssertionDetailView.as_view(), name="detail"),
]
