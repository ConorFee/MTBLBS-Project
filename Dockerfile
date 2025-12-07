# Dockerfile for Django + GeoDjango

FROM python:3.12-slim

# Install system dependencies for GeoDjango (GDAL/PROJ/GEOS)
RUN apt-get update && apt-get install -y \
    build-essential \
    binutils \
    libproj-dev \
    gdal-bin \
    libgdal-dev \
    gettext \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy project code
COPY . .

# Environment
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Expose Django dev server port
EXPOSE 8000

# Run migrations then start dev server
CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
