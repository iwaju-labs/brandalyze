from django.http import JsonResponse
from django.views import View

class HealthCheckView(View):
    """Health check endpoint for deployment platforms"""
    
    def get(self, request):
        return JsonResponse({
            'status': 'healthy',
            'service': 'brandalyze-backend',
            'version': '1.0.0'
        })
