from django.contrib import admin

from .models import SavedRequest


@admin.register(SavedRequest)
class SavedRequestAdmin(admin.ModelAdmin):
    list_display = ["name", "method", "collection", "order", "updated_at"]
    search_fields = ["name", "url"]
