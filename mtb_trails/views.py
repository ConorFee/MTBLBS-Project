from rest_framework import generics, permissions
from rest_framework_gis.filters import InBBoxFilter, DistanceToPointFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import Trail, POI, Park
from .serializers import TrailSerializer, POISerializer, ParkSerializer

# Trails Views
class TrailListCreateView(generics.ListCreateAPIView):
    queryset = Trail.objects.all()
    serializer_class = TrailSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    # Added for Spatial filtering
    filter_backends = [DjangoFilterBackend, InBBoxFilter]
    bbox_filter_field = 'path'  # LineStringField for trail paths

class TrailDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Trail.objects.all()
    serializer_class = TrailSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

# POI Views
class POIListCreateView(generics.ListCreateAPIView):
    queryset = POI.objects.all()
    serializer_class = POISerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    # Spatial filtering
    filter_backends = [DjangoFilterBackend, DistanceToPointFilter, InBBoxFilter]
    bbox_filter_field = 'location'  # PointField for map bounds filtering
    distance_filter_field = 'location'  # Enables distance queries
    distance_filter_convert_meters = True

class POIDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = POI.objects.all()
    serializer_class = POISerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

# Park Views
class ParkListCreateView(generics.ListCreateAPIView):
    queryset = Park.objects.all()
    serializer_class = ParkSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    # Spatial filtering
    filter_backends = [DjangoFilterBackend, InBBoxFilter]
    bbox_filter_field = 'boundary'  # PolygonField for park boundaries

class ParkDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Park.objects.all()
    serializer_class = ParkSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
