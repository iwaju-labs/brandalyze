"""
custom exception definitions for social media API files
"""

# general exceptions
class PlatformUnsupportedError(Exception):
    """Raised when a platform is not supported"""
    pass

# X related exceptions
class XApiNoTweetsFoundError(Exception):
    """Raise when no tweets can be found"""

class XApiNotConfiguredError(Exception):
    """Raise when the API is not configured correctly"""

class XApiRateLimitError(Exception):
    """Raised when the Twitter API rate limit is exceeded"""
    pass

class XApiUnauthorizedError(Exception):
    """Raised when the API credentials are invalid or permissions are insufficient"""
    pass

class XApiForbiddenError(Exception):
    """Raised when access is denied to the API"""
    pass

class XApiNotFoundError(Exception):
    """Raised when the requested user/profile cannot be found"""
    pass

class XApiCatchAllError(Exception):
    """Raised when the source of the error is unknown"""

# LinkedIn related exceptions
class LinkedinApiNotConfiguredError(Exception):
    """Raised when the LinkedIn API isnt configured correctly"""
    pass

class LinkedinApiUnauthorizedError(Exception):
    """Raised when the API credentials are invalid or permissions are insufficient"""
    pass

class LinkedinApiForbiddenError(Exception):
    """Raised when access is denied by the API"""
    pass

class LinkedinApiNotFoundError(Exception):
    """Raised when the requested user/profile cannot be found"""
    pass

class LinkedinApiRateLimitError(Exception):
    """Raised when the API rate limit is exceeded"""
    pass

class LinkedinApiNoPostsFoundError(Exception):
    """Raised when no posts can be found"""
    pass

class LinkedinApiCatchAllError(Exception):
    """Raised when the cause of the error cannot be found"""
    pass