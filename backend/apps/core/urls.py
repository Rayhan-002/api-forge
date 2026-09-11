from django.urls import path

from .views import ExecuteView

app_name = "core"

urlpatterns = [
    path("execute/", ExecuteView.as_view(), name="execute"),
]
