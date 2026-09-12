from django.urls import path

from .views import (
    EnvironmentActivateView,
    EnvironmentDeactivateView,
    EnvironmentDetailView,
    EnvironmentListCreateView,
    EnvironmentVariableDetailView,
    EnvironmentVariablesView,
)

app_name = "environments"

urlpatterns = [
    path("environments/", EnvironmentListCreateView.as_view(), name="list"),
    path("environments/deactivate/", EnvironmentDeactivateView.as_view(), name="deactivate"),
    path("environments/<uuid:pk>/", EnvironmentDetailView.as_view(), name="detail"),
    path("environments/<uuid:pk>/activate/", EnvironmentActivateView.as_view(), name="activate"),
    path(
        "environments/<uuid:environment_id>/variables/", EnvironmentVariablesView.as_view(), name="variables"
    ),
    path(
        "environments/<uuid:environment_id>/variables/<uuid:var_id>/",
        EnvironmentVariableDetailView.as_view(),
        name="variable-detail",
    ),
]
