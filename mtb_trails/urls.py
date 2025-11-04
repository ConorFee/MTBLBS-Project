from django.urls import path
from . import views
from .views import trail_map_view

app_name = 'mtb_trails'

urlpatterns = [
    # TRAILS CRUD
    path('trails/', views.TrailListCreateView.as_view(), name='trail-list-create'),
    path('trails/<int:pk>/', views.TrailDetailView.as_view(), name='trail-detail'),
    # Trails spatial queries 
    path('trails/nearest/', views.nearest_trails, name='nearest_trails'),
    path('trails/within_radius/', views.trails_within_radius, name='trails_within_radius'),
    path('trails/in_park/', views.trails_in_park, name='trails_in_park'),

    # POIS CRUD
    path('pois/', views.POIListCreateView.as_view(), name='poi-list-create'),
    path('pois/<int:pk>/', views.POIDetailView.as_view(), name='poi-detail'),

    # PARKS CRUD
    path('parks/', views.ParkListCreateView.as_view(), name='park-list-create'),
    path('parks/<int:pk>/', views.ParkDetailView.as_view(), name='park-detail'),

    path('map/', trail_map_view, name='trail_map'),
    path('trails/geojson/', views.trails_geojson, name='trails_geojson')

    
]
