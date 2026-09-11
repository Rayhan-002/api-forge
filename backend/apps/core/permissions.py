from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """
    Object-level permission restricting access to the object's owner.

    Views using this must expose the owning user via `obj.owner`. Combined
    with owner-filtered querysets in each ViewSet, a non-owner's request
    resolves to a 404 rather than a 403, avoiding resource-existence leaks.
    """

    def has_object_permission(self, request, view, obj):
        return obj.owner_id == request.user.id
