import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Using a public or placeholder token for the demo.
// The user should replace this with their actual Mapbox token in a real app.
mapboxgl.accessToken = 'pk.eyJ1IjoiZ2VtaW5pLWRlbW8iLCJhIjoiY2xzemZ6OTV2MGM0ajJtcGJ5ZjJ6dWNsayJ9.example_token_replace_me';

const MapCanvas = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng] = useState(-74.0060); // NY Default
  const [lat] = useState(40.7128);
  const [zoom] = useState(3); // Zoomed out for global view

  useEffect(() => {
    if (map.current) return; // initialize map only once
    
    // We try to init. If token is invalid, Mapbox will show an error in console
    // but the canvas will still exist (often just blank or throwing 401s).
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [lng, lat],
        zoom: zoom,
        attributionControl: false, // hide attribution for cleaner look
      });
    } catch (e) {
      console.error("Mapbox INIT ERROR: ", e);
    }

  }, [lng, lat, zoom]);

  return (
    <div className="absolute inset-0 z-0">
      <div ref={mapContainer} className="w-full h-full" />
      {/* Fallback overlay if map doesn't load fully due to token */}
      <div className="absolute inset-0 bg-spectra-black/40 pointer-events-none mix-blend-overlay"></div>
    </div>
  );
};

export default MapCanvas;
