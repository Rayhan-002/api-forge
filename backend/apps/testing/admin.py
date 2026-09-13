from django.contrib import admin

from .models import TestAssertion, TestResult


@admin.register(TestAssertion)
class TestAssertionAdmin(admin.ModelAdmin):
    list_display = ["name", "type", "saved_request", "order"]
    list_filter = ["type"]


@admin.register(TestResult)
class TestResultAdmin(admin.ModelAdmin):
    list_display = ["assertion_name", "passed", "history", "created_at"]
    list_filter = ["passed"]
