from rest_framework import GeoFeatureModelSerializer
from .models import Trail, POI, Park

class TrailSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Trail
        geo_field = 'path'
        fields = '__all__'

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