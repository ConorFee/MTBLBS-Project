from rest_framework import viewsets, permissions
from rest_framework_gis.filters import DistanceToPointFilter, InBBoxFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import Trail, POI, Park
from .serializers import TrailSerializer, POISerializer, ParkSerializer

class TrailViewSet(viewsets.ModelViewSet):
    queryset = Trail.objects.all()
    serializer_class = TrailSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, InBBoxFilter]
    bbox_filter_field = 'path'

class POIViewSet(viewsets.ModelViewSet):
    queryset = POI.objects.all()
    serializer_class = POISerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, DistanceToPointFilter, InBBoxFilter]
    bbox_filter_field = 'location'
    distance_filter_field = 'location'
    distance_filter_convert_meters = True

class ParkViewSet(viewsets.ModelViewSet):
    queryset = Park.objects.all()
    serializer_class = ParkSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, InBBoxFilter]
    bbox_filter_field = 'boundary'