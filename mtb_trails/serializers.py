from rest_framework_gis import serializers as gis_serializers
from rest_framework import serializers
from .models import Trail, POI, Park


class ParkSerializer(gis_serializers.GeoFeatureModelSerializer):
    """
    Serializer for Park model - returns GeoJSON with park boundaries
    """
    class Meta:
        model = Park
        geo_field = 'boundary'
        fields = ['id', 'name', 'description', 'source', 'created_at']


class TrailSerializer(gis_serializers.GeoFeatureModelSerializer):
    """
    Serializer for Trail model - returns GeoJSON with trail routes
    Includes nested park information
    """
    park_name = serializers.CharField(source='park.name', read_only=True, allow_null=True)
    park_id = serializers.IntegerField(source='park.id', read_only=True, allow_null=True)
    
    class Meta:
        model = Trail
        geo_field = 'path'
        fields = [
            'id', 'name', 'park', 'park_name', 'park_id', 
            'difficulty', 'length_km', 'elevation_gain_m', 
            'description', 'source', 'created_at'
        ]


class POISerializer(gis_serializers.GeoFeatureModelSerializer):
    """
    Serializer for POI model - returns GeoJSON with POI locations
    Includes nested park information
    """
    park_name = serializers.CharField(source='park.name', read_only=True, allow_null=True)
    park_id = serializers.IntegerField(source='park.id', read_only=True, allow_null=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = POI
        geo_field = 'location'
        fields = [
            'id', 'name', 'type', 'type_display', 'park', 
            'park_name', 'park_id', 'description', 'source', 'created_at'
        ]
