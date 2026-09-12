from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """
    Object-level permission restricting access to the object's owner.

    Views using this must expose the owning user via `obj.owner`. Combined
    with owner-filtered querysets in each ViewSet, a non-owner's request
    resolves to a 404 rather than a 403, avoiding resource-existence leaks.
    """

    def has_object_permission(self, request, view, obj):
        # Compares the related object, not `owner_id` — `obj.owner` may be a
        # real FK (Collection) or a computed property that resolves
        # ownership transitively (SavedRequest -> its Collection), and both
        # work uniformly this way.
        return obj.owner == request.user
