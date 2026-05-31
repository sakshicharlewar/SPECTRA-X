
import os
import sys
from sqlalchemy import Column, Integer, String, Float, DateTime, create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
import urllib.parse

print("="*50)
print("DEBUG: Initializing models.py...")
print("="*50)

# Get DATABASE_URL with fallback
DATABASE_URL = os.getenv("DATABASE_URL")
print(f"DEBUG: Original DATABASE_URL from env: {repr(DATABASE_URL)}")

using_postgis = False
if not DATABASE_URL:
    print("WARNING: No DATABASE_URL found! Using SQLite for local testing...")
    DATABASE_URL = "sqlite:///./spectrax.db"
else:
    # Try multiple strategies to fix the URL
    strategies = [
        lambda url: url.replace("postgres://", "postgresql://", 1),
        lambda url: url.replace("postgres://", "postgresql+psycopg2://", 1),
        lambda url: url.replace("postgresql://", "postgresql+psycopg2://", 1),
        lambda url: url,  # Keep original if needed
    ]

    for i, strategy in enumerate(strategies):
        test_url = strategy(DATABASE_URL)
        print(f"DEBUG: Trying strategy {i+1}: {repr(test_url)}")
        try:
            test_engine = create_engine(test_url, pool_pre_ping=True, pool_recycle=300)
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"DEBUG: Strategy {i+1} WORKED!")
            DATABASE_URL = test_url
            engine = test_engine
            using_postgis = 'postgresql' in DATABASE_URL
            break
        except Exception as e:
            print(f"DEBUG: Strategy {i+1} failed: {type(e).__name__}: {e}")
    else:
        print("ERROR: All URL strategies failed! Falling back to SQLite...")
        DATABASE_URL = "sqlite:///./spectrax.db"

print(f"DEBUG: Final DATABASE_URL: {repr(DATABASE_URL)}")
print(f"DEBUG: Using PostGIS: {using_postgis}")

# Conditionally import geoalchemy2
Geometry = None
if using_postgis:
    try:
        from geoalchemy2 import Geometry
        print("DEBUG: Successfully imported geoalchemy2.Geometry")
    except Exception as e:
        print(f"WARNING: Could not import geoalchemy2: {e}")
        using_postgis = False

# Create engine with robust settings
if 'engine' not in locals():
    print("DEBUG: Creating engine with final URL...")
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=False,
        connect_args={"connect_timeout": 10} if 'sqlite' not in DATABASE_URL else {}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

print("DEBUG: Defining models...")

class WatchZone(Base):
    __tablename__ = "watch_zones"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    if using_postgis and Geometry:
        geometry = Column(Geometry(geometry_type='POLYGON', srid=4326))
    else:
        geometry = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Add extra fields here for inference results
    veg_loss = Column(String, nullable=True)
    soil_moisture = Column(String, nullable=True)
    activity = Column(String, nullable=True)
    impact_trees = Column(Integer, nullable=True)
    impact_area = Column(Float, nullable=True)
    impact_co2 = Column(Integer, nullable=True)

class SatelliteMetadata(Base):
    __tablename__ = "satellite_metadata"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(String, index=True)
    captured_at = Column(DateTime)
    cloud_cover = Column(Float)
    if using_postgis and Geometry:
        aoi_geometry = Column(Geometry(geometry_type='POLYGON', srid=4326))
    else:
        aoi_geometry = Column(String)
    assets = Column(String)
    veg_loss = Column(String, nullable=True)
    soil_moisture = Column(String, nullable=True)
    impact_trees = Column(Integer, nullable=True)
    impact_area = Column(Float, nullable=True)
    impact_co2 = Column(Integer, nullable=True)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    activity_type = Column(String)
    if using_postgis and Geometry:
        geometry = Column(Geometry(geometry_type='POLYGON', srid=4326))
    else:
        geometry = Column(String)
    detected_at = Column(DateTime, default=datetime.utcnow)
    satellite_id = Column(Integer, nullable=True)
    veg_loss = Column(String, nullable=True)
    soil_moisture = Column(String, nullable=True)
    impact_trees = Column(Integer, nullable=True)
    impact_area = Column(Float, nullable=True)
    impact_co2 = Column(Integer, nullable=True)

print("DEBUG: Models defined successfully!")
print("="*50)
