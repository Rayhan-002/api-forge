from rest_framework import serializers

from .models import Collection


class CollectionSerializer(serializers.ModelSerializer):
    # Populated via .annotate(request_count=Count("requests")) in the view;
    # defaults to 0 for a freshly created collection that has none yet.
    request_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Collection
        fields = ["id", "name", "description", "request_count", "created_at", "updated_at"]
        read_only_fields = ["id", "request_count", "created_at", "updated_at"]
