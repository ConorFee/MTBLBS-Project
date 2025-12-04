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

# Parks Views (NEW)
class ParkListCreateView(generics.ListCreateAPIView):
    """List all parks or create a new park"""
    queryset = Park.objects.all()
    serializer_class = ParkSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class ParkDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a specific park"""
    queryset = Park.objects.all()
    serializer_class = ParkSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

# Existing Trails Views (keep as is)
class TrailListCreateView(generics.ListCreateAPIView):
    queryset = Trail.objects.all()
    serializer_class = TrailSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, InBBoxFilter]
    bbox_filter_field = 'path'

class TrailDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Trail.objects.all()
    serializer_class = TrailSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

# POI Views (existing)
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

# NEW: Get trails for a specific park
@api_view(['GET'])
def park_trails(request, park_id):
    """Get all trails for a specific park"""
    try:
        park = Park.objects.get(id=park_id)
        trails = Trail.objects.filter(park=park)
        serializer = TrailSerializer(trails, many=True)
        return Response({
            'park': ParkSerializer(park).data,
            'trails': serializer.data,
            'count': trails.count()
        })
    except Park.DoesNotExist:
        return Response({'error': 'Park not found'}, status=404)

# NEW: Get POIs for a specific park
@api_view(['GET'])
def park_pois(request, park_id):
    """Get all POIs for a specific park"""
    try:
        park = Park.objects.get(id=park_id)
        pois = POI.objects.filter(park=park)
        serializer = POISerializer(pois, many=True)
        return Response({
            'park': ParkSerializer(park).data,
            'pois': serializer.data,
            'count': pois.count()
        })
    except Park.DoesNotExist:
        return Response({'error': 'Park not found'}, status=404)

# Existing spatial query views (keep these)
@api_view(['GET'])
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

@api_view(['GET'])
def trails_within_radius(request):
    """
    Get trails within a specified radius of a point.
    
    Query parameters:
    - lat: Latitude (default 53.35)
    - lng: Longitude (default -7.5)  
    - radius_km: Search radius in kilometers (default 10)
    
    Returns trails within the radius, ordered by distance.
    """
    lat = float(request.GET.get('lat', 53.35))
    lng = float(request.GET.get('lng', -7.5))
    radius_km = float(request.GET.get('radius_km', 10))
    
    p = Point(lng, lat, srid=4326)
    
    # Filter trails within radius and order by distance
    trails = Trail.objects.filter(
        path__distance_lte=(p, D(km=radius_km))
    ).annotate(
        distance=Distance('path', p)
    ).order_by('distance')
    
    serializer = TrailSerializer(trails, many=True)
    
    # Return GeoJSON with metadata
    return Response({
        'type': 'FeatureCollection',
        'features': serializer.data,
        'query': {
            'center': {'lat': lat, 'lng': lng},
            'radius_km': radius_km,
            'count': trails.count()
        }
    })


@api_view(['GET'])
def trails_in_park(request):
    polygon_wkt = request.GET.get('polygon')
    if not polygon_wkt:
        return Response({'error': 'Polygon WKT required'}, status=400)
    park = GEOSGeometry(polygon_wkt, srid=4326)
    trails = Trail.objects.filter(path__intersects=park)
    serializer = TrailSerializer(trails, many=True)
    return Response(serializer.data)

# Frontend views
def trail_map_view(request):
    return render(request, 'mtb_trails/trail_map.html')

# NEW: GeoJSON endpoints for all models
@api_view(['GET'])
def parks_geojson(request):
    """Return all parks as GeoJSON FeatureCollection"""
    parks = Park.objects.all()
    data = ParkSerializer(parks, many=True).data
    return Response({'type': 'FeatureCollection', 'features': data})

@api_view(['GET'])
def trails_geojson(request):
    """Return all trails as GeoJSON FeatureCollection"""
    trails = Trail.objects.all()
    data = TrailSerializer(trails, many=True).data
    if isinstance(data, dict) and data.get('type') == 'FeatureCollection':
        return Response(data)
    return Response({'type': 'FeatureCollection', 'features': data})

@api_view(['GET'])
def pois_geojson(request):
    """Return all POIs as GeoJSON FeatureCollection"""
    pois = POI.objects.all()
    data = POISerializer(pois, many=True).data
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

def trails_readonly_view(request):
    trails = Trail.objects.all().order_by('name')
    return render(request, 'mtb_trails/trails_list.html', {'trails': trails})
