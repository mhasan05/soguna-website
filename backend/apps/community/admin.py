from django.contrib import admin

from .models import AidDocument, AidRequest, BloodRequest, ContactMessage, JobPost, ServiceProvider

admin.site.register([BloodRequest, AidRequest, AidDocument, ServiceProvider, JobPost, ContactMessage])
