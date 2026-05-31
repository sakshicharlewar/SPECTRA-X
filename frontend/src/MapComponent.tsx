import React from 'react';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, Popup, ZoomControl, Circle } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import './MapComponent.css';

// Helper function to validate GeoJSON
const isValidGeoJSON = (data: any): boolean => {
  try {
    if (!data || typeof data !== 'object') return false;
    if (data.type !== 'FeatureCollection') return false;
    if (!Array.isArray(data.features)) return false;
    // Make sure features are valid
    for (const feature of data.features) {
      if (!feature || typeof feature !== 'object') return false;
      if (feature.type !== 'Feature') return false;
    }
    return true;
  } catch {
    return false;
  }
};

// Fix Leaflet icons issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapComponentProps {
  onWatchZoneCreated: (geoJSON: any) => void;
  onSelectZone: (zoneId: number) => void;
  onDeleteZone: (zoneId: number) => void;
  onCompareZone?: (zoneId: number) => void;
  alerts: any; // GeoJSON FeatureCollection
  watchZones: any; // GeoJSON FeatureCollection
  selectedZoneId: number | null;
  predictionVisible: boolean;
  role: 'Government' | 'NGO' | 'Public';
  isLiveMap?: boolean;
}

export const MapComponent: React.FC<MapComponentProps> = ({ 
  onWatchZoneCreated, 
  onSelectZone,
  onDeleteZone,
  onCompareZone,
  alerts, 
  watchZones,
  selectedZoneId,
  predictionVisible,
  role,
  isLiveMap = true
}) => {
  // Local empty GeoJSON fallback
  const emptyGeoJSON = { type: "FeatureCollection" as const, features: [] };
  const safeAlerts = isValidGeoJSON(alerts) ? alerts : emptyGeoJSON;
  const safeWatchZones = isValidGeoJSON(watchZones) ? watchZones : emptyGeoJSON;

  let initialCenter: [number, number] = [-10.0, -60.0];
  let initialZoom = 5;

  const _onCreated = (e: any) => {
    const layer = e.layer;
    const geoJSON = layer.toGeoJSON();
    onWatchZoneCreated(geoJSON.geometry);
  };

  const onEachAlert = (feature: any, layer: any) => {
    if (feature.properties && feature.properties.activity_type) {
      layer.bindPopup(`
        <div class="map-popup">
          <h3 style="color: var(--accent-alert); margin-bottom: 4px; font-size: 14px;">
            ALERT: ${feature.properties.activity_type.replace('_', ' ').toUpperCase()}
          </h3>
          <p style="font-size: 11px; margin-bottom: 8px; color: var(--text-secondary);">
            Detected: ${new Date(feature.properties.detected_at).toLocaleString()}
          </p>
          <button class="popup-btn">View Satellite Capture</button>
        </div>
      `);
    }
  };

  const onEachWatchZone = (feature: any, layer: any) => {
    if (feature.properties && feature.properties.id) {
       layer.on('click', (e: any) => {
         L.DomEvent.stopPropagation(e);
          onSelectZone(feature.properties.id);
       });
       
       layer.bindPopup(`
         <div class="map-popup">
           <h3 style="color: var(--accent-blue); margin-bottom: 4px; font-size: 14px;">
             WATCH ZONE: ${feature.properties.name}
           </h3>
           <p style="font-size: 11px; margin-bottom: 8px; color: var(--text-secondary);">
             ID: ${feature.properties.id}
           </p>
            <div style="display: flex; gap: 8px;">
             <button class="popup-btn select-btn" onclick="window.onSelectZone(${feature.properties.id})">Inspect</button>
             <button class="popup-btn compare-btn" onclick="if(window.onCompareZone) window.onCompareZone(${feature.properties.id})" style="background: rgba(0,255,255,0.1); color: #00ffff; border: 1px solid rgba(0,255,255,0.3);">Compare</button>
             <button class="popup-btn delete-btn" onclick="window.onDeleteZone(${feature.properties.id})">Delete</button>
           </div>
         </div>
       `);

       layer.bindTooltip(`Watch Zone: ${feature.properties.name}`, { sticky: true });
    }
  };

  // Expose handlers to window for Leaflet popups
  (window as any).onSelectZone = onSelectZone;
  (window as any).onDeleteZone = onDeleteZone;
  if (onCompareZone) (window as any).onCompareZone = onCompareZone;

  return (
    <div className="map-container-wrapper">
      <MapContainer 
            center={initialCenter} 
            zoom={initialZoom} 
            style={{ height: '100%', width: '100%', minHeight: '500px' }}
            zoomControl={false}
          >
        <TileLayer
            url={isLiveMap 
              ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" 
              : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"}
            attribution={isLiveMap ? '&copy; Google Maps' : 'Tiles &copy; Esri &mdash; Source: Esri'}
            className={isLiveMap ? "" : "map-tiles-previous"}
        />

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
          subdomains="abcd"
          className={isLiveMap ? "" : "map-tiles-previous"}
        />

        <ZoomControl position="bottomright" />
        
        <FeatureGroup>
            <EditControl
              position="topright"
              onCreated={_onCreated}
              draw={{
                rectangle: {
                  shapeOptions: {
                    color: 'var(--accent-blue)',
                    weight: 2,
                    opacity: 0.5,
                    fillOpacity: 0.1,
                  },
                  showArea: false,
                  metric: false,
                  repeatMode: false
                },
                polygon: {
                  allowIntersection: false,
                  shapeOptions: {
                    color: 'var(--accent-blue)',
                    weight: 2,
                    opacity: 0.5,
                    fillOpacity: 0.1,
                  },
                  showArea: false,
                  metric: false,
                  repeatMode: false
                },
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
              }}
              edit={{
                remove: true
              }}
              onDeleted={(e: any) => {
                e.layers.eachLayer((layer: any) => {
                  if (layer.feature && layer.feature.properties && layer.feature.properties.id) {
                    onDeleteZone(layer.feature.properties.id);
                  }
                });
              }}
            />
        </FeatureGroup>

        {safeWatchZones.features.length > 0 && (
            <GeoJSON 
                key={`zones-${safeWatchZones.features.length}`}
                data={safeWatchZones} 
                onEachFeature={onEachWatchZone}
                style={(feature) => ({
                    color: feature?.properties.id === selectedZoneId ? "#00f2ff" : "var(--accent-blue)",
                    weight: feature?.properties.id === selectedZoneId ? 4 : 2,
                    opacity: 1,
                    fillOpacity: 0.1,
                    fillColor: "var(--accent-blue)",
                })}
            />
        )}

        {isLiveMap && safeAlerts.features.length > 0 && role !== 'Public' && (
            <GeoJSON 
                key={`alerts-${safeAlerts.features.length}`}
                data={safeAlerts} 
                onEachFeature={onEachAlert}
                style={{
                    color: "var(--accent-alert)",
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.3,
                    fillColor: "var(--accent-alert)",
                    dashArray: "5, 10"
                }}
            />
        )}

        {isLiveMap && predictionVisible && (
          <>
            {/* Mock Prediction Heatmap */}
            <Circle 
              center={[-10.5, -61.0]} 
              radius={50000} 
              pathOptions={{
                fillColor: 'red',
                fillOpacity: 0.4,
                color: 'red',
                weight: 1,
                className: 'pulse-animation'
              }}
            >
              <Popup>Risk: 88% in next 7 days</Popup>
            </Circle>
            <Circle 
              center={[-9.5, -59.0]} 
              radius={40000} 
              pathOptions={{
                fillColor: 'orange',
                fillOpacity: 0.4,
                color: 'orange',
                weight: 1
              }}
            >
              <Popup>Risk: 45% in next 7 days</Popup>
            </Circle>
            <Circle 
              center={[-11.0, -58.0]} 
              radius={60000} 
              pathOptions={{
                fillColor: 'yellow',
                fillOpacity: 0.4,
                color: 'yellow',
                weight: 1
              }}
            >
              <Popup>Risk: 22% in next 7 days</Popup>
            </Circle>
          </>
        )}
      </MapContainer>
    </div>
  );
};
