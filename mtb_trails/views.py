from rest_framework import generics, permissions
from rest_framework_gis.filters import InBBoxFilter, DistanceToPointFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.gis.geos import Point, GEOSGeometry
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import Distance
from django.shortcuts import render

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


@api_view(['POST'])
def nearest_trails(request):
    lat, lng = float(request.data['lat']), float(request.data['lng'])
    p = Point(lng, lat, srid=4326)
    trails = Trail.objects.annotate(d=Distance('path', p)).order_by('d')[:10]
    from .serializers import TrailSerializer
    return Response(TrailSerializer(trails, many=True).data)

@api_view(['POST'])
def trails_within_radius(request):
    lat = float(request.data['lat'])
    lng = float(request.data['lng'])
    radius_km = float(request.data['radius_km'])
    p = Point(lng, lat, srid=4326)
    # convert km to degrees (approximate)
    radius_deg = radius_km / 111.0
    trails = Trail.objects.filter(path__dwithin=(p, radius_deg))
    return Response(TrailSerializer(trails, many=True).data)


@api_view(['POST'])
def trails_in_park(request):
    park = GEOSGeometry(request.data['polygon'], srid=4326)
    trails = Trail.objects.filter(path__intersects=park)
    from .serializers import TrailSerializer
    return Response(TrailSerializer(trails, many=True).data)

def trail_map_view(request):
    return render(request, 'mtb_trails/trail_map.html')