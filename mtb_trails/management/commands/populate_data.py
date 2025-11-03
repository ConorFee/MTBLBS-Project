from django.core.management.base import BaseCommand
from django.contrib.gis.geos import LineString, Point
from ...models import Trail, POI

class Command(BaseCommand):
    def handle(self, *args, **options):
        sample_trails = [
            {'name': 'Ticknock Trail', 'difficulty': 'intermediate', 'length_km': 12.5, 'elevation_gain_m': 300,
             'path': LineString([(-6.26, 53.25), (-6.27, 53.26), (-6.28, 53.27)], srid=4326)},
            {'name': 'Djouce Mountain Loop', 'difficulty': 'expert', 'length_km': 15.2, 'elevation_gain_m': 450,
             'path': LineString([(-6.22, 53.18), (-6.23, 53.19), (-6.24, 53.20)], srid=4326)},
            {'name': 'Glencullen Loop', 'difficulty': 'beginner', 'length_km': 8.0, 'elevation_gain_m': 200,
             'path': LineString([(-6.19, 53.22), (-6.20, 53.23), (-6.21, 53.24)], srid=4326)},
            {'name': 'Fortwilliam Trail', 'difficulty': 'intermediate', 'length_km': 10.1, 'elevation_gain_m': 250,
             'path': LineString([(-6.24, 53.26), (-6.25, 53.27), (-6.26, 53.26)], srid=4326)},
            {'name': 'Laragh Red Trail', 'difficulty': 'advanced', 'length_km': 18.7, 'elevation_gain_m': 400,
             'path': LineString([(-6.15, 53.10), (-6.16, 53.11), (-6.17, 53.12)], srid=4326)},
            {'name': 'Ballinasloe Blue Trail', 'difficulty': 'beginner', 'length_km': 9.3, 'elevation_gain_m': 180,
             'path': LineString([(-8.31, 53.42), (-8.32, 53.43), (-8.33, 53.44)], srid=4326)},
            {'name': 'Slieve Bloom Loop', 'difficulty': 'expert', 'length_km': 22.4, 'elevation_gain_m': 550,
             'path': LineString([(-7.62, 53.06), (-7.63, 53.07), (-7.64, 53.08)], srid=4326)},
            {'name': 'Davagh Forest Red', 'difficulty': 'intermediate', 'length_km': 14.6, 'elevation_gain_m': 320,
             'path': LineString([(-7.15, 54.65), (-7.16, 54.66), (-7.17, 54.67)], srid=4326)},
            {'name': 'Ballyhoura Blue', 'difficulty': 'beginner', 'length_km': 7.9, 'elevation_gain_m': 160,
             'path': LineString([(-8.45, 52.15), (-8.46, 52.16), (-8.47, 52.17)], srid=4326)},
            {'name': 'Wicklow Way MTB', 'difficulty': 'advanced', 'length_km': 16.3, 'elevation_gain_m': 380,
             'path': LineString([(-6.10, 53.05), (-6.11, 53.06), (-6.12, 53.07)], srid=4326)},
        ]
        for data in sample_trails:
            Trail.objects.get_or_create(name=data['name'], defaults=data)

        # Sample POIs (5)
        sample_pois = [
            {'name': 'Dublin Bike Shop', 'type': 'bike_shop', 'location': Point(-6.26, 53.25, srid=4326)},
            {'name': 'Ticknock Parking', 'type': 'parking', 'location': Point(-6.27, 53.26, srid=4326)},
            {'name': 'Glencullen Trailhead', 'type': 'trailhead', 'location': Point(-6.19, 53.22, srid=4326)},
            {'name': 'Wicklow Shop', 'type': 'bike_shop', 'location': Point(-6.15, 53.10, srid=4326)},
            {'name': 'Laragh Parking', 'type': 'parking', 'location': Point(-6.16, 53.11, srid=4326)},
        ]
        for data in sample_pois:
            POI.objects.get_or_create(name=data['name'], defaults=data)

        self.stdout.write(self.style.SUCCESS('10 trails + 5 POIs populated'))