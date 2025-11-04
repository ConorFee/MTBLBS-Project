from rest_framework_gis.serializers import GeoFeatureModelSerializer, GeometrySerializerMethodField
from rest_framework import serializers
from django.contrib.gis.geos import GEOSGeometry, GEOSException
from .models import Trail, POI, Park

class TrailSerializer(GeoFeatureModelSerializer):
    path = GeometrySerializerMethodField()  # Force GeoJSON

    class Meta:
        model = Trail
        geo_field = 'path'
        fields = '__all__'

    def get_path(self, obj):
        return obj.path  # GeoDjango auto-converts to GeoJSON dict

    def create(self, validated_data):
        path_data = validated_data.get('path')
        if isinstance(path_data, str):
            try:
                validated_data['path'] = GEOSGeometry(path_data)
            except GEOSException as e:
                raise serializers.ValidationError({'path': f'Invalid WKT: {str(e)}'})
        return super().create(validated_data)

class POISerializer(GeoFeatureModelSerializer):
    class Meta:
        model = POI
        geo_field = 'location'
        fields = '__all__'

class ParkSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Park
        geo_field = 'boundary'
        fields = '__all__'