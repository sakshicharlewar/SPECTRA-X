import os
from celery import Celery
from engine import SpectraEngine
from stac import STACClient
from models import SessionLocal, SatelliteMetadata, Alert
import json
import redis
from shapely.geometry import shape, mapping

REDIS_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "spectrax_worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

engine = SpectraEngine()
stac_client = STACClient()
redis_client = redis.from_url(REDIS_URL)

@celery_app.task
def process_watch_zone(watch_zone_id: int, geojson_polygon: dict):
    """
    Long-running AI inference task.
    """
    print(f"Starting inference for WatchZone ID: {watch_zone_id}")
    db = SessionLocal()
    try:
        # 1. Pull data
        imagery_info = stac_client.fetch_imagery_for_zone(geojson_polygon)
        if not imagery_info:
            print("No suitable imagery found.")
            return {"status": "no_data"}

        # 2. Save Satellite Metadata
        db_metadata = SatelliteMetadata(
            item_id=imagery_info["item_id"],
            captured_at=imagery_info["captured_at"],
            cloud_cover=imagery_info["cloud_cover"],
            assets=json.dumps(imagery_info["assets"]),
            aoi_geometry=f"SRID=4326;{shape(imagery_info['geometry']).wkt}",
            veg_loss=imagery_info["inference"]["veg_loss"],
            soil_moisture=imagery_info["inference"]["soil_moisture"],
            impact_trees=imagery_info["inference"]["impact_trees"],
            impact_area=imagery_info["inference"]["impact_area"],
            impact_co2=imagery_info["inference"]["impact_co2"]
        )
        db.add(db_metadata)
        db.commit()
        db.refresh(db_metadata)

        # 3. Run inference (placeholder logic)
        result = engine.run_inference(imagery_info["item_id"], imagery_info["assets"])
        
        # 4. Save Alert if anomaly found
        if result["change_ratio"] > 0.1: # Mock threshold
            db_alert = Alert(
                activity_type=result["predicted_activity"],
                geometry=f"SRID=4326;{shape(result['detected_geometry']).wkt}",
                satellite_id=db_metadata.id,
                veg_loss=result["veg_loss"],
                soil_moisture=result["soil_moisture"],
                impact_trees=result["impact_trees"],
                impact_area=result["impact_area"],
                impact_co2=result["co2_impact"]
            )
            db.add(db_alert)
            db.commit()
            print(f"Alert created: {db_alert.id}")
            
            # 5. Push to Redis for WebSocket broadcast
            alert_payload = {
                "type": "Feature",
                "geometry": result["detected_geometry"],
                "properties": {
                    "id": db_alert.id,
                    "activity_type": db_alert.activity_type,
                    "detected_at": db_alert.detected_at.isoformat(),
                    "veg_loss": db_alert.veg_loss,
                    "soil_moisture": db_alert.soil_moisture,
                    "impact_trees": db_alert.impact_trees,
                    "impact_area": db_alert.impact_area,
                    "impact_co2": db_alert.impact_co2
                }
            }
            redis_client.publish("anomalies", json.dumps(alert_payload))
            
        print("Inference completed:", result)
        return {"watch_zone_id": watch_zone_id, "inference_result": result}
    finally:
        db.close()
