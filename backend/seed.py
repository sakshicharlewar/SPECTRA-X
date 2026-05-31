import sys
from shapely.geometry import shape
from models import SessionLocal, Alert, engine, Base
import argparse

def seed_db(reset=False):
    if reset:
        print("Resetting database schema...")
        Base.metadata.drop_all(bind=engine)
        
    print("Creating tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Check if we already have alerts to avoid duplication on multiple runs
    try:
        existing = db.query(Alert).first()
        if existing and not reset:
            print("Database already contains alerts. Skipping seed. (Use --reset to force)")
            db.close()
            return
    except Exception as e:
        print(f"Schema mismatch or table missing: {e}")
        if not reset:
            print("Try running with --reset flag to recreate tables.")
            db.close()
            return

    print("Injecting test alert with new inference metrics...")
    
    test_geometry = {
        "type": "Polygon",
        "coordinates": [[
            [-60.0, -10.0], [-60.01, -10.0], [-60.01, -10.01], [-60.0, -10.01], [-60.0, -10.0]
        ]]
    }
    geom_shape = shape(test_geometry)
    wkt_geom = geom_shape.wkt
    
    alert = Alert(
        activity_type="illegal_deforestation",
        geometry=f"SRID=4326;{wkt_geom}",
        veg_loss="12.5%",
        soil_moisture="Dry (Low)",
        impact_trees=850,
        impact_area=1.8,
        impact_co2=580
    )
    
    db.add(alert)
    db.commit()
    print("Successfully injected test alert into database.")
    db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Drop and recreate all tables")
    args = parser.parse_args()
    seed_db(reset=args.reset)
