from django.contrib import admin

from .models import RequestHistory


@admin.register(RequestHistory)
class RequestHistoryAdmin(admin.ModelAdmin):
    list_display = ["method", "url", "status_code", "success", "owner", "executed_at"]
    list_filter = ["success", "method"]
    search_fields = ["url", "owner__email"]
