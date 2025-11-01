from django.contrib.gis.db import models

class Trail(models.Model):
    name = models.CharField(max_length=100)
    difficulty = models.CharField(max_length=20, choices=[('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('expert', 'Expert')])
    length_km = models.FloatField()
    elevation_gain_m = models.FloatField()
    path = models.LineStringField(srid=4326, db_index=True)

    def __str__(self):
        return self.name

class POI(models.Model):
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=50, choices=[('bike_shop', 'Bike Shop'), ('parking', 'Parking'), ('trailhead', 'Trailhead')])
    location = models.PointField(srid=4326, db_index=True)

    def __str__(self):
        return f"{self.name} ({self.type})"

class Park(models.Model):
    name = models.CharField(max_length=100)
    boundary = models.PolygonField(srid=4326, db_index=True)

    def __str__(self):
        return self.name