class RequestExecutionError(Exception):
    """
    Raised whenever the HTTP request a user asked us to execute could not
    be completed as requested — a blocked/unsafe URL, a DNS or connection
    failure, a timeout, an oversized response, and so on.

    This is deliberately distinct from a validation error on our own API:
    a malformed call to /api/execute/ is a 400 from DRF, but a well-formed
    call whose *target* request fails is a normal 200 with a structured
    failure payload (see apps.core.views.ExecuteView) — Send always
    succeeds from the tool's point of view; only the request under test
    can fail.
    """

    def __init__(self, error_type: str, message: str):
        self.error_type = error_type
        self.message = message
        super().__init__(message)
