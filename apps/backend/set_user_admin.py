import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'brandalyze_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

user = User.objects.get(email='dgspammail7@gmail.com')
user.is_superuser = True
user.is_staff = True
if not user.clerk_metadata:
    user.clerk_metadata = {}
user.clerk_metadata['role'] = 'admin'
user.save()
print(f"Admin set for {user.email}, is_admin: {user.is_admin()}")
