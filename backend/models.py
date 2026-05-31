import os
from sqlalchemy import Column, Integer, String, Float, DateTime, create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import URL
from geoalchemy2 import Geometry
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://spectrax:spectraxpassword@localhost:5432/spectrax_db")

print("DEBUG: Original DATABASE_URL:", repr(DATABASE_URL)) # Debug print

# Fix Render's postgres:// URL to be postgresql:// for SQLAlchemy using SQLAlchemy's URL object
url = URL.make_url(DATABASE_URL)
if url.drivername == "postgres":
    url = url.set(drivername="postgresql")
DATABASE_URL = url.render_as_string(hide_password=False)

print("DEBUG: Modified DATABASE_URL:", repr(DATABASE_URL)) # Debug print

# Add connection pool settings for Render
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class WatchZone(Base):
    __tablename__ = "watch_zones"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    geometry = Column(Geometry(geometry_type='POLYGON', srid=4326))
    created_at = Column(DateTime, default=datetime.utcnow)

class SatelliteMetadata(Base):
    __tablename__ = "satellite_metadata"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(String, index=True) # STAC Item ID
    captured_at = Column(DateTime)
    cloud_cover = Column(Float)
    aoi_geometry = Column(Geometry(geometry_type='POLYGON', srid=4326))
    assets = Column(String) # JSON string of asset URLs
    veg_loss = Column(String)
    soil_moisture = Column(String)
    impact_trees = Column(Integer)
    impact_area = Column(Float)
    impact_co2 = Column(Integer)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    activity_type = Column(String) # e.g., "illegal_mining", "deforestation"
    geometry = Column(Geometry(geometry_type='POLYGON', srid=4326))
    detected_at = Column(DateTime, default=datetime.utcnow)
    satellite_id = Column(Integer) # Optional link to SatelliteMetadata
    veg_loss = Column(String)
    soil_moisture = Column(String)
    impact_trees = Column(Integer)
    impact_area = Column(Float)
    impact_co2 = Column(Integer)

# Ensure the database tables are created (in a real app this might use alembic)
# Note: For PostGIS extensions, you might need to ensure the DB has 'CREATE EXTENSION postgis;'
