from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.collections.models import Collection
from apps.core.permissions import IsOwner
from apps.core.serializers import ExecuteRequestSerializer
from apps.core.services import execute_and_log

from .extraction import apply_extract_rules
from .models import SavedRequest
from .serializers import MoveRequestSerializer, SavedRequestListSerializer, SavedRequestSerializer


class CollectionRequestsView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_collection(self):
        return get_object_or_404(Collection, id=self.kwargs["collection_id"], owner=self.request.user)

    def get_serializer_class(self):
        return SavedRequestListSerializer if self.request.method == "GET" else SavedRequestSerializer

    def get_queryset(self):
        return SavedRequest.objects.filter(collection=self.get_collection())

    def perform_create(self, serializer):
        collection = self.get_collection()
        next_order = collection.requests.count()
        serializer.save(collection=collection, order=next_order)


class SavedRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SavedRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return SavedRequest.objects.filter(collection__owner=self.request.user).select_related("collection")


class SavedRequestMoveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        saved_request = get_object_or_404(SavedRequest.objects.filter(collection__owner=request.user), pk=pk)
        serializer = MoveRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_collection = get_object_or_404(
            Collection.objects.filter(owner=request.user), pk=serializer.validated_data["collection"]
        )

        saved_request.collection = target_collection
        saved_request.order = target_collection.requests.count()
        saved_request.save(update_fields=["collection", "order", "updated_at"])

        return Response(SavedRequestSerializer(saved_request).data)


class SavedRequestExecuteView(APIView):
    """
    Executes a saved request, linking the resulting history entry back to
    it and applying its `extract_rules` on a successful response.

    The caller still supplies the request body to send (same shape as
    apps.core.views.ExecuteView) rather than this endpoint re-reading the
    persisted fields itself — the frontend passes the live builder draft,
    so unsaved edits are what actually gets sent, exactly like the ad-hoc
    endpoint. `extract_rules`, though, always come from the persisted
    SavedRequest, since chaining is tied to the saved request's identity,
    not to a particular draft.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "execute"

    def post(self, request, pk):
        saved_request = get_object_or_404(SavedRequest.objects.filter(collection__owner=request.user), pk=pk)

        serializer = ExecuteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        response_data, result = execute_and_log(
            owner=request.user, payload=payload, saved_request=saved_request
        )

        extractions = []
        if result is not None:
            extractions = apply_extract_rules(
                owner=request.user, extract_rules=saved_request.extract_rules, response_body=result.body
            )
        response_data["extractions"] = extractions

        return Response(response_data)
