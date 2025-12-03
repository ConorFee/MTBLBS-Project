from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import Trail, POI, Park


@admin.register(Park)
class ParkAdmin(GISModelAdmin):
    list_display = ['name', 'source', 'created_at']
    list_filter = ['source', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'boundary')
        }),
        ('Data Source', {
            'fields': ('source', 'source_id'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Trail)
class TrailAdmin(GISModelAdmin):
    list_display = ['name', 'park', 'difficulty', 'length_km', 'elevation_gain_m', 'source']
    list_filter = ['difficulty', 'source', 'park']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'park', 'difficulty', 'description')
        }),
        ('Metrics', {
            'fields': ('length_km', 'elevation_gain_m')
        }),
        ('Geography', {
            'fields': ('path',)
        }),
        ('Data Source', {
            'fields': ('source', 'source_id'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(POI)
class POIAdmin(GISModelAdmin):
    list_display = ['name', 'type', 'park', 'source']
    list_filter = ['type', 'source', 'park']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'park', 'type', 'description')
        }),
        ('Geography', {
            'fields': ('location',)
        }),
        ('Data Source', {
            'fields': ('source', 'source_id'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
