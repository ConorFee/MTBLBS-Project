# MTB Trails Ireland — GeoDjango + PostGIS + Leaflet

A lightweight Location-Based Services (LBS) web app to **view, search, add, and find nearby** mountain-bike trails in Ireland.  
Backed by **Django/GeoDjango + PostGIS** and rendered with **Leaflet** as GeoJSON.

## Features
- 🗺️ **Interactive map** (Leaflet + OSM tiles), Ireland-centric view.
- 🧵 **Trail geometry** stored as `LineString` (SRID 4326), emitted as GeoJSON.
- 🔎 **Search & filter** by name and difficulty.
- ➕ **Add trail** from the map via a WKT line builder (click to append points; press `Esc` to clear).
- 📍 **Find nearest** trails to a chosen point (or geolocation) within a given radius.
- 📄 **Read-only list page** for quick inspection of all trails.

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
