from django.contrib import admin

from .models import Environment, EnvironmentVariable


class EnvironmentVariableInline(admin.TabularInline):
    model = EnvironmentVariable
    extra = 0


@admin.register(Environment)
class EnvironmentAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "owner__email"]
    inlines = [EnvironmentVariableInline]
