from django.urls import path
from . import views

urlpatterns = [
    # Parks endpoints (NEW)
    path('api/parks/', views.ParkListCreateView.as_view(), name='park-list'),
    path('api/parks/<int:pk>/', views.ParkDetailView.as_view(), name='park-detail'),
    path('api/parks/geojson/', views.parks_geojson, name='parks-geojson'),
    path('api/parks/<int:park_id>/trails/', views.park_trails, name='park-trails'),
    path('api/parks/<int:park_id>/pois/', views.park_pois, name='park-pois'),
    
    # Trails endpoints (existing)
    path('api/trails/', views.TrailListCreateView.as_view(), name='trail-list'),
    path('api/trails/<int:pk>/', views.TrailDetailView.as_view(), name='trail-detail'),
    path('api/trails/geojson/', views.trails_geojson, name='trails-geojson'),
    path('api/trails/search/', views.search_trails, name='search-trails'),
    path('api/trails/proximity/', views.nearest_trails, name='nearest-trails'),
    path('api/trails/within-radius/', views.trails_within_radius, name='trails-within-radius'),
    path('api/trails/in-park/', views.trails_in_park, name='trails-in-park'),
    
    # POIs endpoints (existing)
    path('api/pois/', views.POIListCreateView.as_view(), name='poi-list'),
    path('api/pois/<int:pk>/', views.POIDetailView.as_view(), name='poi-detail'),
    path('api/pois/geojson/', views.pois_geojson, name='pois-geojson'),
    
    # Frontend views
    path('map/', views.trail_map_view, name='trail-map'),
    path('trails/', views.trails_readonly_view, name='trails-list'),
]
