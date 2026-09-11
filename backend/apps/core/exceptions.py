"""
Central DRF exception handler.

Ensures API error responses are always a consistent, minimal JSON shape
and that unexpected exceptions never leak a raw traceback to the client.
"""

import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger("apps")


def api_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is not None:
        detail = response.data
        if isinstance(detail, dict) and "detail" in detail and len(detail) == 1:
            message = detail["detail"]
        else:
            message = detail
        response.data = {"error": message}
        return response

    # Unhandled exception: log the real error server-side, return a generic
    # message to the client (never expose stack traces / internals).
    logger.exception("Unhandled exception in API view", exc_info=exc)
    return Response({"error": "An unexpected error occurred. Please try again."}, status=500)
