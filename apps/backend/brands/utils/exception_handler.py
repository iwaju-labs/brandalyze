from rest_framework.views import exception_handler
from rest_framework import status
from django.core.exceptions import ValidationError
from .responses import error_response

def custom_exception_handler(exception, context):
    """Custom exception handler for consistent error responses"""
    response = exception_handler(exception, context)

    if response is not None:
        if hasattr(exception, "detail") and isinstance(exception.detail, dict):
            return error_response(
                message="Validation failed",
                code="VALIDATION_ERROR",
                field_errors=exception.detail,
                status_code=response.status_code
                )
        else:
            return error_response(
                message=str(exception.detail),
                code=exception.__class__.__name__.upper(),
                status_code=response.status_code
            )
    return error_response(
        message="An unexpected error occurred",
        code="INTERNAL_ERROR",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )