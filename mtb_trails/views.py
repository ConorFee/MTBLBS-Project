from rest_framework import generics, permissions
from rest_framework_gis.filters import InBBoxFilter, DistanceToPointFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.gis.geos import Point, GEOSGeometry
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import Distance
from django.shortcuts import render
from django.db.models import Q

from .models import Trail, POI, Park
from .serializers import TrailSerializer, POISerializer, ParkSerializer

# Trails Views
class TrailListCreateView(generics.ListCreateAPIView):
    queryset = Trail.objects.all()
    serializer_class = TrailSerializer
    permission_classes = [permissions.AllowAny]  # For testing; revert to IsAuthenticatedOrReadOnly
    filter_backends = [DjangoFilterBackend, InBBoxFilter]
    bbox_filter_field = 'path'

class TrailDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Trail.objects.all()
    serializer_class = TrailSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

# POI Views
class POIListCreateView(generics.ListCreateAPIView):
    queryset = POI.objects.all()
    serializer_class = POISerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, DistanceToPointFilter, InBBoxFilter]
    bbox_filter_field = 'location'
    distance_filter_field = 'location'
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
    filter_backends = [DjangoFilterBackend, InBBoxFilter]
    bbox_filter_field = 'boundary'

class ParkDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Park.objects.all()
    serializer_class = ParkSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

@api_view(['GET'])  # Changed to GET
def nearest_trails(request):
    lat = float(request.GET.get('lat', 53.35))
    lng = float(request.GET.get('lng', -7.5))
    radius_km = float(request.GET.get('radius', 50))
    p = Point(lng, lat, srid=4326)
    trails = Trail.objects.filter(
        path__distance_lte=(p, D(km=radius_km))
    ).annotate(d=Distance('path', p)).order_by('d')[:10]
    serializer = TrailSerializer(trails, many=True)
    return Response(serializer.data)

@api_view(['GET'])  # Changed to GET
def trails_within_radius(request):
    lat = float(request.GET.get('lat', 53.35))
    lng = float(request.GET.get('lng', -7.5))
    radius_km = float(request.GET.get('radius_km', 10))
    p = Point(lng, lat, srid=4326)
    trails = Trail.objects.filter(path__dwithin=(p, D(km=radius_km)))
    serializer = TrailSerializer(trails, many=True)
    return Response(serializer.data)

@api_view(['GET'])  # Changed to GET
def trails_in_park(request):
    polygon_wkt = request.GET.get('polygon')  # Pass as WKT query param
    if not polygon_wkt:
        return Response({'error': 'Polygon WKT required'}, status=400)
    park = GEOSGeometry(polygon_wkt, srid=4326)
    trails = Trail.objects.filter(path__intersects=park)
    serializer = TrailSerializer(trails, many=True)
    return Response(serializer.data)

def trail_map_view(request):
    return render(request, 'mtb_trails/trail_map.html')

@api_view(['GET'])
def trails_geojson(request):
    trails = Trail.objects.all()
    data = TrailSerializer(trails, many=True).data
    # If DRF-GIS already returned a FeatureCollection, return it as-is:
    if isinstance(data, dict) and data.get('type') == 'FeatureCollection':
        return Response(data)
    # Fallback (e.g., if you ever swap the serializer):
    return Response({'type': 'FeatureCollection', 'features': data})

@api_view(['GET'])
def search_trails(request):
    query = request.GET.get('q', '')
    qs = Trail.objects.filter(
        Q(name__icontains=query) | Q(difficulty__icontains=query)
    ) if query else Trail.objects.all()
    data = TrailSerializer(qs, many=True).data
    if isinstance(data, dict) and data.get('type') == 'FeatureCollection':
        return Response(data)
    return Response({'type': 'FeatureCollection', 'features': data})