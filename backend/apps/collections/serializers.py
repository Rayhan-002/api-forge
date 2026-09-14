from rest_framework import serializers

from .models import Collection
from .services import get_descendant_ids


class CollectionSerializer(serializers.ModelSerializer):
    # Populated via .annotate(request_count=Count("requests")) in the view;
    # defaults to 0 for a freshly created collection that has none yet.
    request_count = serializers.IntegerField(read_only=True, default=0)
    # Queryset is scoped to the caller's own collections in __init__ below,
    # so pointing `parent` at someone else's collection resolves as "does
    # not exist" rather than leaking whether it exists at all.
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Collection.objects.none(), required=False, allow_null=True
    )

    class Meta:
        model = Collection
        fields = ["id", "name", "description", "parent", "request_count", "created_at", "updated_at"]
        read_only_fields = ["id", "request_count", "created_at", "updated_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["parent"].queryset = Collection.objects.filter(owner=request.user)

    def validate_parent(self, parent):
        if parent is None or self.instance is None:
            return parent
        if parent.id == self.instance.id:
            raise serializers.ValidationError("A collection can't be its own parent.")
        if parent.id in get_descendant_ids(self.instance):
            raise serializers.ValidationError("Can't move a collection into one of its own subfolders.")
        return parent
