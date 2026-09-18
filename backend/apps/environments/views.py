from django.db.models import Count
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsOwner

from .models import Environment, EnvironmentVariable
from .serializers import EnvironmentSerializer, EnvironmentVariableSerializer
from .services import activate_environment, deactivate_all


class EnvironmentListCreateView(generics.ListCreateAPIView):
    serializer_class = EnvironmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Environment.objects.filter(owner=self.request.user)
            .annotate(variable_count=Count("variables"))
            .order_by("name")
        )

    def perform_create(self, serializer):
        name = serializer.validated_data["name"]
        if Environment.objects.filter(owner=self.request.user, name=name).exists():
            raise ValidationError({"name": f"An environment named '{name}' already exists."})
        serializer.save(owner=self.request.user)


class EnvironmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EnvironmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Environment.objects.filter(owner=self.request.user).annotate(variable_count=Count("variables"))

    def perform_update(self, serializer):
        name = serializer.validated_data.get("name")
        instance = serializer.instance
        if name and name != instance.name:
            if Environment.objects.filter(owner=self.request.user, name=name).exists():
                raise ValidationError({"name": f"An environment named '{name}' already exists."})
        serializer.save()


class EnvironmentActivateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: EnvironmentSerializer},
        description="Activates this environment and deactivates any other active one for the "
        "caller — at most one environment is active at a time.",
    )
    def post(self, request, pk):
        environment = get_object_or_404(Environment.objects.filter(owner=request.user), pk=pk)
        activate_environment(request.user, environment)
        return Response(EnvironmentSerializer(environment).data)


class EnvironmentDeactivateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        deactivate_all(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EnvironmentVariablesView(generics.ListCreateAPIView):
    serializer_class = EnvironmentVariableSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_environment(self):
        return get_object_or_404(Environment, id=self.kwargs["environment_id"], owner=self.request.user)

    def get_queryset(self):
        return EnvironmentVariable.objects.filter(environment=self.get_environment())

    def perform_create(self, serializer):
        environment = self.get_environment()
        key = serializer.validated_data["key"]
        if EnvironmentVariable.objects.filter(environment=environment, key=key).exists():
            raise ValidationError({"key": f"A variable named '{key}' already exists in this environment."})
        serializer.save(environment=environment)


class EnvironmentVariableDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EnvironmentVariableSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    lookup_url_kwarg = "var_id"

    def get_queryset(self):
        return EnvironmentVariable.objects.filter(
            environment__owner=self.request.user, environment_id=self.kwargs["environment_id"]
        ).select_related("environment")

    def perform_update(self, serializer):
        key = serializer.validated_data.get("key")
        instance = serializer.instance
        if key and key != instance.key:
            if EnvironmentVariable.objects.filter(environment=instance.environment, key=key).exists():
                raise ValidationError(
                    {"key": f"A variable named '{key}' already exists in this environment."}
                )
        serializer.save()
