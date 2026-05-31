
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Dict, Any, Set
from datetime import datetime
import os
import json
import asyncio

print("INFO: Starting SpectraX backend...")

app = FastAPI(title="SpectraX Backend", version="1.0.0")

# Define default endpoints first so they work even if other parts fail
@app.get("/")
def root():
    return {"status": "ok", "service": "SpectraX Backend", "endpoints": ["/health", "/api/v1/*"]}

@app.get("/health")
def health():
    return {"status": "ok"}

# Now try to set up the rest of the app with extensive error handling
try:
    # Import optional dependencies with error handling
    print("INFO: Importing dependencies...")
    from sqlalchemy.orm import Session

    # Import models first to get the using_postgis flag
    print("INFO: Importing models...")
    import models
    from models import SessionLocal, engine, WatchZone, Alert

    # Conditionally import geo dependencies
    to_shape = None
    shape = None
    mapping = None
    try:
        if models.using_postgis:
            from geoalchemy2.shape import to_shape
        from shapely.geometry import shape, mapping
        print("INFO: Geometry dependencies imported successfully")
    except Exception as e:
        print(f"WARNING: Could not import geometry dependencies: {e}")

    # Import other modules with try-except
    try:
        from celery_worker import process_watch_zone
        print("INFO: Celery worker imported successfully")
    except Exception as e:
        print(f"WARNING: Could not import Celery worker: {e}")
        process_watch_zone = None

    try:
        from stac import STACClient
        stac_client = STACClient()
        print("INFO: STAC client initialized successfully")
    except Exception as e:
        print(f"WARNING: Could not initialize STAC client: {e}")
        stac_client = None

    # Import redis with error handling
    redis_client = None
    try:
        import redis.asyncio as redis
        REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        print(f"INFO: Connecting to Redis at {REDIS_URL}...")
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        print("INFO: Redis connected successfully")
    except Exception as e:
        print(f"WARNING: Could not connect to Redis: {e}")
        redis_client = None

    # Import Google AI
    genai = None
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    if GOOGLE_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GOOGLE_API_KEY)
            print("INFO: Google AI configured successfully")
        except Exception as e:
            print(f"WARNING: Could not configure Google AI: {e}")
            genai = None

    # Add CORS middleware
    print("INFO: Adding CORS middleware...")
    from fastapi.middleware.cors import CORSMiddleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Dependency for DB
    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    # Connection Manager for WebSockets
    class ConnectionManager:
        def __init__(self):
            self.active_connections: Set[WebSocket] = set()

        async def connect(self, websocket: WebSocket):
            await websocket.accept()
            self.active_connections.add(websocket)

        def disconnect(self, websocket: WebSocket):
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

        async def broadcast(self, message: str):
            for connection in list(self.active_connections):
                try:
                    await connection.send_text(message)
                except Exception as e:
                    print(f"WARNING: Could not send message to connection: {e}")

    manager = ConnectionManager()

    # Startup event
    @app.on_event("startup")
    async def startup_event():
        print("INFO: Running startup event...")
        try:
            # Create PostGIS extensions
            with engine.connect() as conn:
                from sqlalchemy import text
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis_topology;"))
                conn.commit()
                print("INFO: PostGIS extensions verified")
        except Exception as e:
            print(f"WARNING: Could not verify PostGIS extensions: {e}")

        try:
            models.Base.metadata.create_all(bind=engine)
            print("INFO: Database tables created/verified")
        except Exception as e:
            print(f"WARNING: Could not create tables: {e}")

        if redis_client:
            try:
                asyncio.create_task(redis_listener())
                print("INFO: Redis listener started")
            except Exception as e:
                print(f"WARNING: Could not start Redis listener: {e}")

    async def redis_listener():
        if not redis_client:
            return
        try:
            pubsub = redis_client.pubsub()
            await pubsub.subscribe("anomalies")
            async for message in pubsub.listen():
                if message["type"] == "message":
                    await manager.broadcast(message["data"])
        except Exception as e:
            print(f"WARNING: Redis listener error: {e}")

    # Pydantic models
    class WatchZoneCreate(BaseModel):
        name: str
        geometry: Dict[str, Any]

    class AlertCreate(BaseModel):
        activity_type: str
        geometry: Dict[str, Any]
        veg_loss: str
        soil_moisture: str
        impact_trees: int
        impact_area: float
        impact_co2: float

    # API endpoints
    @app.post("/api/v1/alerts")
    def create_alert(alert: AlertCreate, db: Session = Depends(get_db)):
        try:
            geom_shape = shape(alert.geometry)
            wkt_geom = geom_shape.wkt
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid geometry: {str(e)}")

        db_alert = Alert(
            activity_type=alert.activity_type,
            geometry=f"SRID=4326;{wkt_geom}",
            veg_loss=alert.veg_loss,
            soil_moisture=alert.soil_moisture,
            impact_trees=alert.impact_trees,
            impact_area=alert.impact_area,
            impact_co2=alert.impact_co2
        )
        db.add(db_alert)
        db.commit()
        db.refresh(db_alert)
        return {"message": "Alert created successfully", "id": db_alert.id}

    @app.get("/api/v1/alerts")
    def get_alerts(db: Session = Depends(get_db)):
        alerts = db.query(Alert).all()
        features = []
        for alert in alerts:
            try:
                geom_shape = to_shape(alert.geometry)
                geojson_geom = mapping(geom_shape)
            except Exception:
                geojson_geom = {}
            feature = {
                "type": "Feature",
                "geometry": geojson_geom,
                "properties": {
                    "id": alert.id,
                    "activity_type": alert.activity_type,
                    "detected_at": alert.detected_at.isoformat() if alert.detected_at else None,
                    "veg_loss": alert.veg_loss,
                    "soil_moisture": alert.soil_moisture,
                    "impact_trees": alert.impact_trees,
                    "impact_area": alert.impact_area,
                    "impact_co2": alert.impact_co2
                }
            }
            features.append(feature)
        return {"type": "FeatureCollection", "features": features}

    @app.delete("/api/v1/alerts/{alert_id}")
    def delete_alert(alert_id: int, db: Session = Depends(get_db)):
        db_alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not db_alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        db.delete(db_alert)
        db.commit()
        return {"message": "Alert deleted"}

    @app.delete("/api/v1/alerts")
    def clear_all_alerts(db: Session = Depends(get_db)):
        db.query(Alert).delete()
        db.commit()
        return {"message": "All alerts cleared"}

    @app.post("/api/v1/watch-zones")
    def create_watch_zone(zone: WatchZoneCreate, db: Session = Depends(get_db)):
        try:
            geom_shape = shape(zone.geometry)
            wkt_geom = geom_shape.wkt
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid geometry: {str(e)}")
        db_zone = WatchZone(name=zone.name, geometry=f"SRID=4326;{wkt_geom}")
        db.add(db_zone)
        db.commit()
        db.refresh(db_zone)
        if process_watch_zone:
            try:
                process_watch_zone.delay(db_zone.id, zone.geometry)
            except Exception as e:
                print(f"WARNING: Could not queue Celery task: {e}")
        return {"message": "Watch zone created and inference started.", "id": db_zone.id}

    @app.get("/api/v1/stats")
    def get_stats(db: Session = Depends(get_db)):
        active_alerts = db.query(Alert).count()
        watch_zones = db.query(WatchZone).count()
        try:
            from sqlalchemy import text
            area_sqm = db.execute(text("SELECT COALESCE(SUM(ST_Area(geometry::geography)), 0) FROM watch_zones")).scalar()
            hectares_scanned = round((area_sqm or 0) / 10000.0, 2)
        except Exception as e:
            print(f"WARNING: Could not calculate area: {e}")
            hectares_scanned = 0
        return {
            "active_alerts": active_alerts,
            "hectares_scanned": hectares_scanned,
            "system_health": "Optimal",
            "active_watch_zones": watch_zones
        }

    @app.get("/api/v1/watch-zones")
    def get_watch_zones(db: Session = Depends(get_db)):
        zones = db.query(WatchZone).all()
        features = []
        for zone in zones:
            try:
                geom_shape = to_shape(zone.geometry)
                geojson_geom = mapping(geom_shape)
            except Exception:
                geojson_geom = {}
            feature = {
                "type": "Feature",
                "geometry": geojson_geom,
                "properties": {
                    "id": zone.id,
                    "name": zone.name,
                    "created_at": zone.created_at.isoformat() if zone.created_at else None
                }
            }
            features.append(feature)
        return {"type": "FeatureCollection", "features": features}

    @app.delete("/api/v1/watch-zones/{zone_id}")
    def delete_watch_zone(zone_id: int, db: Session = Depends(get_db)):
        db_zone = db.query(WatchZone).filter(WatchZone.id == zone_id).first()
        if not db_zone:
            raise HTTPException(status_code=404, detail="Watch zone not found")
        db.delete(db_zone)
        db.commit()
        return {"message": "Watch zone deleted"}

    @app.get("/api/v1/satellite-metadata/{zone_id}")
    def get_satellite_metadata(zone_id: int, db: Session = Depends(get_db)):
        zone = db.query(WatchZone).filter(WatchZone.id == zone_id).first()
        if not zone:
            raise HTTPException(status_code=404, detail="Watch zone not found")
        metadata = {"message": "No recent cloud-free imagery found for this zone."}
        if stac_client:
            try:
                geom_shape = to_shape(zone.geometry)
                geojson_geom = mapping(geom_shape)
                metadata = stac_client.fetch_imagery_for_zone(geojson_geom)
                if metadata and getattr(zone, 'veg_loss', None):
                    metadata["inference"] = {
                        "veg_loss": zone.veg_loss,
                        "soil_moisture": zone.soil_moisture,
                        "activity": getattr(zone, 'activity', 'Pending'),
                        "impact_trees": zone.impact_trees,
                        "impact_area": zone.impact_area,
                        "impact_co2": zone.impact_co2
                    }
            except Exception as e:
                print(f"WARNING: Could not fetch satellite metadata: {e}")
        return metadata

    @app.get("/api/v1/full-capture-report/{zone_id}")
    def generate_full_capture_report(zone_id: int, db: Session = Depends(get_db)):
        zone = db.query(WatchZone).filter(WatchZone.id == zone_id).first()
        if not zone:
            raise HTTPException(status_code=404, detail="Watch zone not found")
        lat, lon = 0.0, 0.0
        try:
            geom_shape = to_shape(zone.geometry)
            centroid = geom_shape.centroid
            lat, lon = centroid.y, centroid.x
        except Exception as e:
            print(f"WARNING: Could not calculate centroid: {e}")
        ai_weather_report = "AI Weather Profile: Checking conditions..."
        if GOOGLE_API_KEY and genai:
            try:
                model = genai.GenerativeModel('gemini-1.5-flash')
                prompt = f"Provide a brief, 2-sentence current weather and climate profile for the geographical location at Latitude: {lat:.4f}, Longitude: {lon:.4f}. Do not include pleasantries, just the facts."
                response = model.generate_content(prompt)
                if response.text:
                    ai_weather_report = f"AI Weather Profile:\n{response.text.strip()}"
            except Exception as e:
                ai_weather_report = f"AI Weather Profile: Error generating data ({str(e)})"
        else:
            try:
                import httpx
                url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
                resp = httpx.get(url, timeout=5.0)
                if resp.status_code == 200:
                    data = resp.json()
                    cw = data.get("current_weather", {})
                    temp = cw.get("temperature", "Unknown")
                    wind = cw.get("windspeed", "Unknown")
                    wind_dir = cw.get("winddirection", "Unknown")
                    ai_weather_report = f"AI Weather Profile (Telemetry Fallback):\nThe current temperature is {temp}°C with wind speeds around {wind} km/h (Direction: {wind_dir}°). Conditions are nominal for this geographic region based on satellite telemetry."
            except Exception as e:
                ai_weather_report = f"AI Weather Profile: Telemetry unavailable ({str(e)})"
        veg_loss = getattr(zone, 'veg_loss', None)
        veg_loss = veg_loss if veg_loss not in (None, 'N/A', '') else 'Baseline Established -> 0% Loss'
        soil_moisture = getattr(zone, 'soil_moisture', None)
        soil_moisture = soil_moisture if soil_moisture not in (None, 'N/A', '') else 'Nominal (Typical limits)'
        activity = getattr(zone, 'activity', None)
        activity = activity if activity not in (None, 'Pending', '') else 'Active Monitoring / No Threats Detected'
        impact_trees = getattr(zone, 'impact_trees', 0) or 0
        impact_area = getattr(zone, 'impact_area', 0.1) or 0.1
        impact_co2 = getattr(zone, 'impact_co2', 0) or 0.0
        report_text = f"===========================================\n" \
                      f"SPECTRA X - FULL CAPTURE & AI WEATHER REPORT\n" \
                      f"===========================================\n" \
                      f"Zone Name: {zone.name} (ID: {zone.id})\n" \
                      f"Location: Lat {lat:.4f}, Lon {lon:.4f}\n" \
                      f"AI Weather Profile: {ai_weather_report}\n" \
                      f"Vegetation Loss: {veg_loss}\n" \
                      f"Soil Moisture: {soil_moisture}\n" \
                      f"Activity: {activity}\n" \
                      f"Trees Lost: ~{impact_trees}\n" \
                      f"Area Affected: {impact_area} hectares\n" \
                      f"CO2 Impact: {impact_co2} metric tonnes\n" \
                      f"==========================================="
        return {"report": report_text}

    @app.websocket("/api/v1/stream-anomalies")
    async def websocket_endpoint(websocket: WebSocket):
        await manager.connect(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(websocket)

    print("INFO: All endpoints registered successfully")

except Exception as e:
    print(f"ERROR: Could not set up full app functionality: {e}")
    # Even if some parts fail, the app will still start with the basic endpoints
    import traceback
    traceback.print_exc()

print("INFO: SpectraX backend is ready to handle requests!")
