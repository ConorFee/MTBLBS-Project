from django.contrib.gis.db import models
from django.core.validators import MinValueValidator

class Park(models.Model):
    """
    Mountain bike park/trail center with a defined boundary area.
    Represents the overall area like 'Ticknock Forest' or 'Ballyhoura Mountain Bike Park'.
    The boundary is a Polygon showing the park's geographic extent.
    """
    name = models.CharField(
        max_length=100,
        help_text="Park name (e.g., 'Ticknock Forest', 'Ballyhoura MTB Park')"
    )
    description = models.TextField(
        blank=True,
        help_text="Details about the park, facilities, location information"
    )
    boundary = models.PolygonField(
        srid=4326, 
        db_index=True,
        help_text="Geographic boundary of the park area"
    )
    
    # Data source tracking - useful for knowing where data came from
    source = models.CharField(
        max_length=50,
        choices=[
            ('manual', 'Manual Entry'),
            ('osm', 'OpenStreetMap'),
            ('other', 'Other Source')
        ],
        default='manual'
    )
    source_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="External ID from data source (e.g., OSM way ID)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']
        verbose_name = "Mountain Bike Park"
        verbose_name_plural = "Mountain Bike Parks"


class Trail(models.Model):
    """
    Individual MTB trail route represented as a LineString path.
    Each trail belongs to a park (or can be standalone if park is null).
    The path field contains the actual route geometry as coordinates.
    """
    name = models.CharField(
        max_length=100,
        help_text="Trail name (e.g., 'Ticknock Blue Trail', 'Black Diamond Run')"
    )
    
    # NEW: Link trail to a parent park (optional for backward compatibility)
    park = models.ForeignKey(
        Park,
        on_delete=models.CASCADE,
        related_name='trails',
        null=True,  # Allows existing trails without park to remain valid
        blank=True,
        help_text="Parent park this trail belongs to"
    )
    
    difficulty = models.CharField(
        max_length=20,
        choices=[
            ('beginner', 'Beginner'),
            ('intermediate', 'Intermediate'),
            ('expert', 'Expert')
        ]
    )
    
    length_km = models.FloatField(
        validators=[MinValueValidator(0.1)],
        help_text="Trail length in kilometers"
    )
    
    elevation_gain_m = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text="Total elevation gain in meters"
    )
    
    # KEEP LineString - this is correct for trail routes!
    path = models.LineStringField(
        srid=4326,
        db_index=True,
        help_text="Trail route as a line geometry (sequence of coordinates)"
    )
    
    # NEW: Additional metadata
    description = models.TextField(
        blank=True,
        help_text="Trail description, features, warnings, etc."
    )
    
    # Data source tracking
    source = models.CharField(
        max_length=50,
        choices=[
            ('manual', 'Manual Entry'),
            ('osm', 'OpenStreetMap'),
            ('other', 'Other Source')
        ],
        default='manual'
    )
    source_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="External ID from data source (e.g., OSM relation ID)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        if self.park:
            return f"{self.name} ({self.park.name})"
        return self.name
    
    class Meta:
        ordering = ['name']


class POI(models.Model):
    """
    Point of Interest - specific locations relevant to MTB activities.
    Examples: parking areas, bike shops, trailheads, cafes, viewpoints.
    Represented as a Point geometry (single lat/lon coordinate).
    """
    name = models.CharField(
        max_length=100,
        help_text="POI name (e.g., 'Ticknock Car Park', 'Mountain View Cafe')"
    )
    
    # NEW: Link POI to a parent park (optional)
    park = models.ForeignKey(
        Park,
        on_delete=models.CASCADE,
        related_name='pois',
        null=True,  # Allows POIs outside of parks (e.g., nearby bike shops)
        blank=True,
        help_text="Associated park (if POI is within/near a park)"
    )
    
    type = models.CharField(
        max_length=50,
        choices=[
            ('bike_shop', 'Bike Shop'),
            ('parking', 'Parking'),
            ('trailhead', 'Trailhead'),
            ('cafe', 'Cafe/Restaurant'),  # NEW
            ('viewpoint', 'Viewpoint'),   # NEW
            ('rest_area', 'Rest Area'),   # NEW
            ('toilets', 'Toilets'),       # NEW
            ('water', 'Water Source'),    # NEW
            ('other', 'Other')            # NEW
        ]
    )
    
    location = models.PointField(
        srid=4326,
        db_index=True,
        help_text="Geographic location of the POI"
    )
    
    # NEW: Additional metadata
    description = models.TextField(
        blank=True,
        help_text="Details about the POI, facilities, opening hours, etc."
    )
    
    # Data source tracking
    source = models.CharField(
        max_length=50,
        choices=[
            ('manual', 'Manual Entry'),
            ('osm', 'OpenStreetMap'),
            ('other', 'Other Source')
        ],
        default='manual'
    )
    source_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="External ID from data source (e.g., OSM node ID)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"
    
    class Meta:
        ordering = ['name']
        verbose_name = "Point of Interest"
        verbose_name_plural = "Points of Interest"
