from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions

from apps.core.permissions import IsOwner
from apps.saved_requests.models import SavedRequest

from .models import TestAssertion
from .serializers import TestAssertionSerializer


class SavedRequestTestsView(generics.ListCreateAPIView):
    serializer_class = TestAssertionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_saved_request(self):
        return get_object_or_404(
            SavedRequest.objects.filter(collection__owner=self.request.user), id=self.kwargs["request_id"]
        )

    def get_queryset(self):
        return TestAssertion.objects.filter(saved_request=self.get_saved_request())

    def perform_create(self, serializer):
        saved_request = self.get_saved_request()
        next_order = saved_request.assertions.count()
        serializer.save(saved_request=saved_request, order=next_order)


class TestAssertionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TestAssertionSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return TestAssertion.objects.filter(saved_request__collection__owner=self.request.user)
