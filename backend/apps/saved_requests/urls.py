from django.urls import path

from .views import CollectionRequestsView, SavedRequestDetailView, SavedRequestMoveView

app_name = "saved_requests"

urlpatterns = [
    path(
        "collections/<uuid:collection_id>/requests/",
        CollectionRequestsView.as_view(),
        name="collection-requests",
    ),
    path("requests/<uuid:pk>/", SavedRequestDetailView.as_view(), name="detail"),
    path("requests/<uuid:pk>/move/", SavedRequestMoveView.as_view(), name="move"),
]
