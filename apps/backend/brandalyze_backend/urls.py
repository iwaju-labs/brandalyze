"""
URL configuration for brandalyze_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from brands.views import (
    BrandViewSet,
    BrandSampleViewSet,
    upload_file,
    analyze_text,
    analyze_brand_alignment,
    get_user_usage,
)
from .health import HealthCheckView

router = DefaultRouter()
router.register(r"brands", BrandViewSet, basename="brand")
router.register(r"samples", BrandSampleViewSet, basename="sample")

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health_check"),
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/upload/brand-style", upload_file, name="upload_file"),
    path("api/analyze/text", analyze_text, name="analyze_text"),
    path(
        "api/analyze/brand-alignment",
        analyze_brand_alignment,
        name="analyze_brand_alignment",
    ),
    path("api/user/usage", get_user_usage, name="get_user_usage"),
    path("api/payments/", include("payments.urls")),
    path("api/extension/", include("extensions.urls")),
    path("api/audits/", include("audits.urls")),
]