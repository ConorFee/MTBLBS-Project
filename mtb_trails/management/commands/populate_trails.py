import os
from django.core.management.base import BaseCommand
from mtb_trails.models import Trail  # Adjust import if needed

class Command(BaseCommand):
    help = 'Populate database with sample MTB trail data'

    def handle(self, *args, **options):
        sample_trails = [
            {
                'name': 'Wicklow Way MTB',
                'difficulty': 'beginner',
                'length_km': 16.3,
                'elevation_gain_m': 380,
                'path': 'LINESTRING(-6.26 53.25, -6.27 53.26, -6.28 53.27, -6.29 53.28)'  # Sample WKT
            },
            {
                'name': 'Ballyhoura Blue',
                'difficulty': 'beginner',
                'length_km': 7.9,
                'elevation_gain_m': 160,
                'path': 'LINESTRING(-8.45 52.12, -8.46 52.13, -8.47 52.14)'
            },
            {
                'name': 'Davagh Forest Red',
                'difficulty': 'intermediate',
                'length_km': 14.6,
                'elevation_gain_m': 320,
                'path': 'LINESTRING(-6.95 54.65, -6.96 54.66, -6.97 54.67, -6.98 54.68)'
            },
            # Add 7 more similar entries (e.g., Slieve Bloom, etc.) for 10 total
            # ... (truncate for brevity; copy pattern)
        ]

        for trail_data in sample_trails:
            trail, created = Trail.objects.get_or_create(
                name=trail_data['name'],
                defaults=trail_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created: {trail.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Exists: {trail.name}'))

        self.stdout.write(self.style.SUCCESS('Sample trails populated!'))