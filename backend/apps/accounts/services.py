"""
JWT issuing/rotation and refresh-cookie helpers.

Refresh-token rotation is tracked in the Django cache (Redis in Docker/prod,
LocMemCache in native dev) rather than SimpleJWT's DB-backed blacklist app:
each refresh token is single-use — once it is redeemed, its jti is marked
"used" with a TTL equal to its own remaining lifetime, so entries expire on
their own. Presenting an already-used refresh token is treated as token
theft/reuse and revokes the session.
"""

from django.core.cache import cache
from django.utils import timezone
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User

REFRESH_USED_CACHE_PREFIX = "refresh_used"


class InvalidRefreshSession(Exception):
    """Raised for any invalid, expired, or reused refresh token."""


def issue_tokens_for_user(user: User) -> tuple[str, str]:
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), str(refresh)


def _mark_used(jti: str, exp_timestamp: int) -> None:
    ttl = max(exp_timestamp - int(timezone.now().timestamp()), 1)
    cache.set(f"{REFRESH_USED_CACHE_PREFIX}:{jti}", True, timeout=ttl)


def _is_used(jti: str) -> bool:
    return cache.get(f"{REFRESH_USED_CACHE_PREFIX}:{jti}") is not None


def rotate_refresh_token(refresh_token_str: str) -> tuple[str, str]:
    """
    Redeem a refresh token for a fresh access + refresh token pair.

    Raises InvalidRefreshSession if the token is malformed, expired,
    belongs to an inactive/deleted user, or has already been used once.
    """
    try:
        old_token = RefreshToken(refresh_token_str)
    except TokenError as exc:
        raise InvalidRefreshSession("Refresh token is invalid or expired.") from exc

    jti = old_token["jti"]
    if _is_used(jti):
        raise InvalidRefreshSession("Refresh token has already been used.")

    try:
        user = User.objects.get(id=old_token["user_id"], is_active=True)
    except User.DoesNotExist as exc:
        raise InvalidRefreshSession("User is inactive or no longer exists.") from exc

    _mark_used(jti, old_token["exp"])
    return issue_tokens_for_user(user)


def invalidate_refresh_token(refresh_token_str: str) -> None:
    """Best-effort invalidation used on logout; ignores malformed tokens."""
    try:
        token = RefreshToken(refresh_token_str)
        _mark_used(token["jti"], token["exp"])
    except TokenError:
        pass
