from rest_framework.response import Response
from rest_framework import status
from datetime import datetime

def success_response(data=None, message=None, metadata=None, status_code=status.HTTP_200_OK):
    """Standardized success response format"""
    response_data = {
        "success": True,
        "timestamp": datetime.now().isoformat()
    }

    if message:
        response_data["message"] = message

    if data is not None:
        response_data["data"] = data
    
    if metadata: 
        response_data["metadata"] = metadata
    
    return Response(response_data, status=status_code)

def error_response(message, code=None, details=None, field_errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Standardized error response format"""
    error_data = {
        "message": message
    }

    if code:
        error_data["code"] = code
    
    if details:
        error_data["details"] = details

    if field_errors:
        error_data["field_errors"] = field_errors
    
    response_data = {
        "success": False,
        "error": error_data,
        "timestamp": datetime.now().isoformat()
    }

    return Response(response_data, status=status_code)