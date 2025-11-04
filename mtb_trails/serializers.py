from rest_framework_gis.serializers import GeoFeatureModelSerializer, GeometrySerializerMethodField
from rest_framework import serializers
from django.contrib.gis.geos import GEOSGeometry, GEOSException
from .models import Trail, POI, Park

class TrailSerializer(GeoFeatureModelSerializer):
    # Read-only GeoJSON out
    path = GeometrySerializerMethodField(read_only=True)
    # Write-only WKT in
    path_wkt = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = Trail
        geo_field = 'path'
        # IMPORTANT: __all__ won't include extra non-model fields -> list them explicitly
        fields = ('id', 'name', 'difficulty', 'length_km', 'elevation_gain_m', 'path', 'path_wkt')

    def get_path(self, obj):
        # GeoDjango returns a mapping compatible with GeoJSON
        return obj.path

    def create(self, validated_data):
        wkt = validated_data.pop('path_wkt', None)
        if wkt:
            try:
                validated_data['path'] = GEOSGeometry(wkt)
            except GEOSException as e:
                raise serializers.ValidationError({'path_wkt': f'Invalid WKT: {str(e)}'})
        elif 'path' not in validated_data:
            raise serializers.ValidationError({'path_wkt': 'This field is required.'})
        return super().create(validated_data)

    def update(self, instance, validated_data):
        wkt = validated_data.pop('path_wkt', None)
        if wkt:
            try:
                validated_data['path'] = GEOSGeometry(wkt)
            except GEOSException as e:
                raise serializers.ValidationError({'path_wkt': f'Invalid WKT: {str(e)}'})
        return super().update(instance, validated_data)


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
