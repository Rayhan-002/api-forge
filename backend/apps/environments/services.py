from django.db import transaction

from .models import Environment


@transaction.atomic
def activate_environment(owner, environment: Environment) -> None:
    Environment.objects.filter(owner=owner).exclude(pk=environment.pk).update(is_active=False)
    environment.is_active = True
    environment.save(update_fields=["is_active", "updated_at"])


def deactivate_all(owner) -> None:
    Environment.objects.filter(owner=owner, is_active=True).update(is_active=False)


def get_active_variables(owner) -> dict[str, str]:
    """Enabled key/value pairs from the caller's active environment, if any."""
    environment = Environment.objects.filter(owner=owner, is_active=True).first()
    if not environment:
        return {}
    return dict(environment.variables.filter(enabled=True).values_list("key", "value"))
