from django.urls import path
from . import views

app_name = 'mtb_trails'

urlpatterns = [
    # TRAILS CRUD
    path('trails/', views.TrailListCreateView.as_view(), name='trail-list-create'),
    path('trails/<int:pk>/', views.TrailDetailView.as_view(), name='trail-detail'),

    # POIS CRUD
    path('pois/', views.POIListCreateView.as_view(), name='poi-list-create'),
    path('pois/<int:pk>/', views.POIDetailView.as_view(), name='poi-detail'),

    # PARKS CRUD
    path('parks/', views.ParkListCreateView.as_view(), name='park-list-create'),
    path('parks/<int:pk>/', views.ParkDetailView.as_view(), name='park-detail'),
]
