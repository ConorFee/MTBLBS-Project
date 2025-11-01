from django.contrib import admin
from .models import Trail, POI, Park

@admin.register(Trail)
class TrailAdmin(admin.ModelAdmin):
    list_display = ('name', 'difficulty', 'length_km', 'elevation_gain_m')
    list_filter = ('difficulty',)
    search_fields = ('name',)

@admin.register(POI)
class POIAdmin(admin.ModelAdmin):
    list_display = ('name', 'type')
    list_filter = ('type',)
    search_fields = ('name',)

@admin.register(Park)
class ParkAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)