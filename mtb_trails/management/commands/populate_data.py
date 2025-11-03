from django.core.management.base import BaseCommand
from django.contrib.gis.geos import LineString, Point
from ...models import Trail, POI

class Command(BaseCommand):
    def handle(self, *args, **options):
        # Sample Trail (LineString)
        Trail.objects.get_or_create(
            name='Ticknock Trail', defaults={
                'difficulty': 'intermediate', 'length_km': 12.5, 'elevation_gain_m': 300,
                'path': LineString([(-6.26, 53.25), (-6.27, 53.26)], srid=4326)
            }
        )
        # Sample POI (Point)
        POI.objects.get_or_create(
            name='Dublin Bike Shop', defaults={
                'type': 'bike_shop', 'location': Point(-6.26, 53.25, srid=4326)
            }
        )
        self.stdout.write(self.style.SUCCESS('Sample data populated'))