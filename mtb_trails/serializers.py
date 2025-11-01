from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Trail, POI, Park

class TrailSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Trail
        geo_field = 'path'  # LineString (geometry)
        fields = '__all__'

class POISerializer(GeoFeatureModelSerializer):
    class Meta:
        model = POI
        geo_field = 'location'  # Point (geometry)
        fields = '__all__'

class ParkSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Park
        geo_field = 'boundary'  # Polygon (geometry)
        fields = '__all__'
