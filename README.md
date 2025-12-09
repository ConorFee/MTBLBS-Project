# MTB Trails Ireland — GeoDjango + PostGIS + Leaflet

A lightweight Location-Based Services (LBS) web app to **view, search, add, and find nearby** mountain-bike trails in Ireland.  
Backed by **Django/GeoDjango + PostGIS** and rendered with **Leaflet** as GeoJSON.

## Features
- 🗺️ **Interactive map** (Leaflet + OSM tiles), Ireland-centric view.
- 🧵 **Trail geometry** stored as `LineString` (SRID 4326) and `Polygons`, emitted as GeoJSON.
- 🔎 **Search & filter** by name and difficulty.
- ➕ **Add trail** from the map via a WKT line builder (click to append points; press `Esc` to clear).
- 📍 **Find nearest** trails to a chosen point (or geolocation) within a given radius.
- 📄 **Read-only list page** for quick inspection of all trails.

test commit

---

## Tech Stack
- **Backend:** Django, **GeoDjango**, Django REST Framework, **drf-gis**
- **DB:** PostgreSQL + **PostGIS**
- **Frontend:** Leaflet, Bootstrap 5
- **Formats:** GeoJSON (API output), WKT (create)

---

## Quickstart (Local)

```bash
# 1) Clone + venv
git clone https://github.com/ConorFee/MTBLBS-Project.git
cd MTBLBS-Project
python -m venv .venv && source .venv/bin/activate

# 2) Install
pip install -r requirements.txt

# 3) Create Postgres DB with PostGIS enabled
# psql:
#   CREATE DATABASE mtbdb;
#   \c mtbdb
#   CREATE EXTENSION postgis;

# 4) Configure environment
cp .env.example .env
# Edit DB settings inside .env to point at your Postgres/PostGIS

# 5) Migrate & run
python manage.py migrate
python manage.py runserver
```

## API Reference

All spatial responses are returned as **GeoJSON** unless otherwise noted.

| **Endpoint** | **Method** | **Purpose** | **Notes** |
|---------------|-------------|--------------|------------|
| `/api/trails/` | **GET** | List all trails | Returns GeoJSON Features (via `drf-gis`). |
| `/api/trails/` | **POST** | Create a new trail | Body: `name`, `difficulty`, `length_km`, `elevation_gain_m`, **`path` (WKT LineString)**. |
| `/api/trails/<id>/` | **GET / PUT / PATCH / DELETE** | Retrieve, update, or delete a trail | Operates on a single GeoDjango model instance. |
| `/api/trails/geojson/` | **GET** | Retrieve a full FeatureCollection of all trails | Used by the map to load all trail data. |
| `/api/trails/search/?q=...` | **GET** | Search trails by name or difficulty | Returns a filtered FeatureCollection. |
| `/api/trails/proximity/?lat=&lng=&radius=` | **GET** | Find nearest trails within a given radius (km) | Uses PostGIS distance filters (`path__distance_lte`). |
| `/api/pois/` | **GET / POST** | Manage Points of Interest (POIs) | Returns GeoJSON Point features (future extension). |
| `/api/parks/` | **GET / POST** | Manage Parks or Boundary areas | Returns GeoJSON Polygon features (future extension). |

Payload Example:

```bash
{
  "name": "Ticknock Blue",
  "difficulty": "intermediate",
  "length_km": 12.5,
  "elevation_gain_m": 300,
  "path": "LINESTRING(-6.26 53.25, -6.27 53.26, -6.28 53.27)"
}

```

## Known Issues/Limitations

 - No auth/roles in demo mode (open create/delete if left enabled).
 - Create expects valid WKT; invalid input is rejected with a 400.
 - Only SRID 4326 supported out of the box.
 - If your DB lacks the postgis extension, migrations will fail.
