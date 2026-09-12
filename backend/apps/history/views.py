from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsOwner

from .models import RequestHistory
from .serializers import RequestHistorySerializer


class HistoryListView(generics.ListAPIView):
    serializer_class = RequestHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = RequestHistory.objects.filter(owner=self.request.user)

        method = self.request.query_params.get("method")
        if method:
            queryset = queryset.filter(method=method.upper())

        success = self.request.query_params.get("success")
        if success is not None:
            queryset = queryset.filter(success=success.lower() == "true")

        return queryset


class HistoryDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = RequestHistorySerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return RequestHistory.objects.filter(owner=self.request.user)


class HistoryClearView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        RequestHistory.objects.filter(owner=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
