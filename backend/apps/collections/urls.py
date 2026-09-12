from django.urls import path

from .views import CollectionDetailView, CollectionListCreateView

app_name = "collections"

urlpatterns = [
    path("collections/", CollectionListCreateView.as_view(), name="list"),
    path("collections/<uuid:pk>/", CollectionDetailView.as_view(), name="detail"),
]
