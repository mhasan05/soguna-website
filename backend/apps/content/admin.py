from django.contrib import admin

from .models import Album, Event, EventRSVP, Notice, Photo, Video

admin.site.register([Notice, Event, EventRSVP, Album, Photo, Video])
