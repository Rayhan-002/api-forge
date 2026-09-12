from django.db.models import Count
from rest_framework import generics, permissions

from apps.core.permissions import IsOwner

from .models import Collection
from .serializers import CollectionSerializer


class CollectionListCreateView(generics.ListCreateAPIView):
    serializer_class = CollectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # `.annotate()` doesn't reliably preserve Meta.ordering, so it's
        # made explicit here — otherwise pagination warns about ordering
        # an unordered queryset (and page results could shuffle between
        # requests).
        return (
            Collection.objects.filter(owner=self.request.user)
            .annotate(request_count=Count("requests"))
            .order_by("name")
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class CollectionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CollectionSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Collection.objects.filter(owner=self.request.user).annotate(request_count=Count("requests"))
