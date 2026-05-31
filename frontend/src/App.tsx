import { useState, useEffect } from 'react';
import './App.css';
import { MapComponent } from './MapComponent';
import { 
  AlertTriangle, 
  Activity, 
  Satellite, 
  Shield, 
  Maximize2,
  Users,
  Globe,
  Building,
  Bell,
  TrendingDown,
  Droplets,
  Download,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// This URL assumes the backend is active at this port
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/v1` 
  : 'http://localhost:8000/api/v1';

interface AlertFeature {
  type: string;
  geometry: any;
  properties: {
    id: number;
    activity_type: string;
    detected_at: string;
  };
}

function App() {
  const [alerts, setAlerts] = useState<{ type: string; features: AlertFeature[] }>({ type: "FeatureCollection", features: [] });
  const [watchZones, setWatchZones] = useState<{ type: string; features: any[] }>({ type: "FeatureCollection", features: [] });
  const [stats, setStats] = useState({ active_alerts: 0, hectares_scanned: 0, system_health: "Loading...", active_watch_zones: 0 });
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [satelliteMetadata, setSatelliteMetadata] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [currentRole, setCurrentRole] = useState<'Government' | 'NGO' | 'Public'>('Government');
  const [predictionVisible, setPredictionVisible] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    fetchAlerts();
    fetchWatchZones();
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
        // Auto-select first alert if none selected
        if (data.features?.length > 0 && !selectedAlert && !selectedZone) {
          setSelectedAlert(data.features[0].properties);
        }
      }
    } catch (error) {
      console.error("Failed to fetch alerts", error);
    }
  };

  const fetchWatchZones = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/watch-zones`);
      if (response.ok) {
        const data = await response.json();
        setWatchZones(data);
      }
    } catch (error) {
      console.error("Failed to fetch watch zones", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats", error);
    }
  };

  const fetchSatelliteMetadata = async (zoneId: number, currentGeo?: any) => {
    setIsScanning(true);
    setSelectedZone(zoneId);
    setSelectedAlert(null); // Clear alert selection when selecting a zone
    try {
      const response = await fetch(`${API_BASE_URL}/satellite-metadata/${zoneId}`);
      if (response.ok) {
        const data = await response.json();
        setSatelliteMetadata(data);
        
        // Push Alert to DB if activity found
        if (data.inference && data.inference.activity && data.inference.activity.toLowerCase() !== 'none') {
          let targetGeom = currentGeo;
          if (!targetGeom) {
             const targetZone = watchZones?.features?.find((f: any) => f.properties.id === zoneId);
             targetGeom = targetZone?.geometry;
          }
          
          if (targetGeom) {
             await fetch(`${API_BASE_URL}/alerts`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                   activity_type: data.inference.activity,
                   geometry: targetGeom,
                   veg_loss: data.inference.veg_loss || "0%",
                   soil_moisture: data.inference.soil_moisture || "0%",
                   impact_trees: data.inference.impact_trees || 0,
                   impact_area: data.inference.impact_area || 0.1,
                   impact_co2: data.inference.impact_co2 || 0
               })
             });
             fetchAlerts();
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch satellite metadata", error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCompareZone = (zoneId: number) => {
    fetchSatelliteMetadata(zoneId);
    setCompareMode(true);
  };

  const deleteWatchZone = async (zoneId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/watch-zones/${zoneId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchStats();
        fetchWatchZones();
        if (selectedZone === zoneId) {
          setSelectedZone(null);
          setSatelliteMetadata(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete watch zone", error);
    }
  };

  const deleteAlert = async (alertId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchAlerts();
        fetchStats();
        if (selectedAlert?.id === alertId) {
          setSelectedAlert(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete alert", error);
    }
  };

  const clearAllAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchAlerts();
        fetchStats();
        setSelectedAlert(null);
      }
    } catch (error) {
      console.error("Failed to clear alerts", error);
    }
  };

  const handleWatchZoneCreated = async (geoJSONGeometry: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/watch-zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Zone ${new Date().toLocaleTimeString()}`,
          geometry: geoJSONGeometry
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        fetchStats();
        fetchWatchZones();
        if (data.id) {
          fetchSatelliteMetadata(data.id, geoJSONGeometry);
        }
      }
    } catch (error) {
      console.error("Failed to create watch zone", error);
    }
  };

  const handleDownloadReport = () => {
    let rawData = "";
    if (selectedAlert) {
      rawData = `===========================================
SPECTRA X - CONTINUOUS AI INFERENCE IMPACT REPORT
===========================================
Alert ID: ${selectedAlert.id}
Activity Type: ${selectedAlert.activity_type.replace('_', ' ').toUpperCase()}
Detected At: ${new Date(selectedAlert.detected_at).toLocaleString()}
-------------------------------------------
ENVIRONMENTAL METRICS:
Vegetation Loss: ${selectedAlert.veg_loss}
Soil Moisture: ${selectedAlert.soil_moisture}
-------------------------------------------
ESTIMATED IMPACT:
Trees Lost: ~${selectedAlert.impact_trees}
Area Affected: ${selectedAlert.impact_area} hectares
CO2 Impact: ${selectedAlert.impact_co2} metric tonnes
===========================================`;
    } else if (satelliteMetadata?.inference) {
      rawData = `===========================================
SPECTRA X - CONTINUOUS AI ZONE INFERENCE REPORT
===========================================
Zone ID: ${selectedZone}
Capture Date: ${new Date(satelliteMetadata.captured_at).toLocaleDateString()}
Cloud Cover: ${satelliteMetadata.cloud_cover?.toFixed(1) || 0}%
-------------------------------------------
ENVIRONMENTAL METRICS:
Vegetation Loss: ${satelliteMetadata.inference.veg_loss}
Soil Moisture: ${satelliteMetadata.inference.soil_moisture}
-------------------------------------------
ESTIMATED IMPACT:
Trees Lost: ~${satelliteMetadata.inference.impact_trees}
Area Affected: ${satelliteMetadata.inference.impact_area} hectares
CO2 Impact: ${satelliteMetadata.inference.impact_co2} metric tonnes
===========================================`;
    } else {
      alert("No active context selected to download data.");
      return;
    }

    const blob = new Blob([rawData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedAlert 
        ? `spectrax-alert-${selectedAlert.id}-report.txt` 
        : `spectrax-zone-${selectedZone}-report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCaptureData = async () => {
    if (!selectedZone) {
      alert("No watch zone selected.");
      return;
    }
    
    setIsGeneratingReport(true);
    try {
      const response = await fetch(`${API_BASE_URL}/full-capture-report/${selectedZone}`);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([data.report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `spectrax-full-capture-${selectedZone}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert("Failed to generate capture report.");
      }
    } catch (error) {
       console.error("Failed to download report", error);
       alert("Error generating full capture report.");
    } finally {
       setIsGeneratingReport(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await resp.json();
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        // Approximate 5km bounding box
        const offset = 0.045;
        const box = {
          type: "Polygon",
          coordinates: [[
            [lon - offset, lat - offset],
            [lon + offset, lat - offset],
            [lon + offset, lat + offset],
            [lon - offset, lat + offset],
            [lon - offset, lat - offset]
          ]]
        };
        
        await handleWatchZoneCreated(box);
      } else {
        alert("Location not found.");
      }
    } catch (error) {
       console.error("Geocoding failed", error);
    } finally {
       setIsSearching(false);
    }
  };

  const getAIAnalysis = () => {
    const data = selectedAlert || satelliteMetadata?.inference;
    if (!data) return null;

    const area = data.impact_area || 0.1;
    const cutTrees = data.impact_trees || 0;
    const beforeTrees = Math.floor(area * 1250); // Generalizing ~1250 trees per ha for old growth canopy
    const remaining = Math.max(0, beforeTrees - cutTrees);
    
    // Attempt fallback naming
    const locationName = searchQuery ? searchQuery : (selectedAlert ? `Alert ID #${selectedAlert.id} Area` : `Watch Zone AOI`);

    return (
      <div className="glass-panel p-4 mb-4 mx-4 mt-4 text-xs text-white/90 leading-relaxed border-blue/40 border">
        <h4 className="text-blue font-bold tracking-widest text-sm mb-3 flex items-center gap-2">
          <Activity size={16} /> AI VISION ANALYSIS
        </h4>
        <p className="mb-3 text-sm">
          <strong>Location:</strong> {locationName}
        </p>
        <ul className="space-y-2 text-[13px]">
           <li>• <strong>Original Canopy:</strong> ~{beforeTrees.toLocaleString()} trees historically present.</li>
           <li>• <strong>Trees Cleared:</strong> <span className="text-red-400 font-bold text-sm">~{cutTrees.toLocaleString()}</span> trees cut down.</li>
           <li>• <strong>Remaining Canopy:</strong> ~{remaining.toLocaleString()} trees.</li>
           <li>• <strong>Activity Status:</strong> <span className="uppercase text-orange-300 font-bold">{data.activity_type ? data.activity_type.replace('_', ' ') : (data.activity || 'Deforestation')}</span></li>
        </ul>
      </div>
    );
  };

  return (
    <div className="spectrax-app">
      <header className="app-header">
        <div className="logo min-w-max">
          <Shield className="inline-block mr-2" size={24} />
          SpectraX
        </div>

        <div className="header-controls flex flex-row items-center gap-4 flex-1 justify-center px-4">
            <div className="glass-panel p-1 flex gap-1">
              <input 
                type="text" 
                placeholder="Search place..." 
                className="bg-transparent text-[11px] px-3 py-1 outline-none text-white placeholder:text-white/50 w-48"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button 
                className="map-control-btn active flex items-center justify-center px-3"
                onClick={handleSearch}
                disabled={isSearching}
              >
                <Search size={12} className={isSearching ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="glass-panel p-1 flex gap-1">
              <button className="map-control-btn active">Satellite</button>
              <button className="map-control-btn">Alerts</button>
              <button 
                className={`map-control-btn ${predictionVisible ? 'active-prediction' : ''}`}
                onClick={() => setPredictionVisible(!predictionVisible)}
              >
                Prediction
              </button>
              {compareMode && (
                <button 
                  className="map-control-btn tracking-widest text-red-500 font-bold border-red-500/30 ml-2 bg-red-500/10 hover:bg-red-500 hover:text-white"
                  onClick={() => setCompareMode(false)}
                >
                  Exit Compare
                </button>
              )}
            </div>
        </div>
        
        <div className="role-switcher glass-panel">
          <span className="text-[10px] uppercase tracking-widest text-secondary mr-2">Mode:</span>
          <div className="flex gap-1">
            <button 
              onClick={() => setCurrentRole('Government')}
              className={`role-btn ${currentRole === 'Government' ? 'active' : ''}`}
              title="Government Mode"
            >
              <Building size={14} />
              <span>Gov</span>
            </button>
            <button 
              onClick={() => setCurrentRole('NGO')}
              className={`role-btn ${currentRole === 'NGO' ? 'active' : ''}`}
              title="NGO Mode"
            >
              <Globe size={14} />
              <span>NGO</span>
            </button>
            <button 
              onClick={() => setCurrentRole('Public')}
              className={`role-btn ${currentRole === 'Public' ? 'active' : ''}`}
              title="Public Mode"
            >
              <Users size={14} />
              <span>Public</span>
            </button>
          </div>
        </div>

        <div className="stats-panel">
          {currentRole !== 'Public' && (
            <>
              <div className="stat">
                <span className="stat-label">System Health</span>
                <span className={`stat-value ${stats.system_health === 'Optimal' ? 'text-green' : 'text-red'}`}>
                  <Activity className="inline-block mr-1" size={14} />
                  {stats.system_health}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Active Alerts</span>
                <span className="stat-value text-red">{stats.active_alerts}</span>
              </div>
            </>
          )}
          <div className="stat">
            <span className="stat-label">Area Monitored</span>
            <span className="stat-value">{stats.hectares_scanned.toLocaleString()} hA</span>
          </div>
        </div>
      </header>

      <aside className="sidebar">
        {getAIAnalysis()}
        <div className="panel-header border-t border-white/10 mt-2">
          <span className="panel-title">{currentRole === 'Public' ? 'Local Awareness' : 'Active Alert Feed'}</span>
          <div className="flex items-center gap-2">
            {currentRole !== 'Public' && alerts.features.length > 0 && (
              <button 
                onClick={clearAllAlerts}
                className="text-[9px] text-red-400 hover:text-red-300 transition-colors uppercase font-bold tracking-tighter"
              >
                Clear All
              </button>
            )}
            <Bell size={16} className={alerts.features.length > 0 ? "text-red animate-pulse" : "text-secondary"} />
          </div>
        </div>
        <div className="alert-list">
          <AnimatePresence>
            {alerts.features.map((alert) => (
              <motion.div 
                key={alert.properties.id} 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={`alert-card glass-panel relative overflow-hidden ${selectedAlert?.id === alert.properties.id ? 'active' : ''} ${currentRole === 'Public' ? 'public-card' : ''}`}
                onClick={() => setSelectedAlert(alert.properties)}
              >
                <div className="alert-type">
                  <AlertTriangle size={14} />
                  {alert.properties.activity_type.replace('_', ' ')}
                </div>
                {currentRole !== 'Public' && (
                  <>
                    <div className="alert-time">
                      {new Date(alert.properties.detected_at).toLocaleString()}
                    </div>
                    
                    <div className="alert-actions mt-3 pt-3 border-t border-white/5 flex gap-2">
                       <button className="flex-1 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all" onClick={(e) => { e.stopPropagation(); setSelectedAlert(alert.properties); }}>View</button>
                       <button className="flex-1 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500 hover:text-white transition-all">Notify</button>
                       <button className="flex-1 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all" onClick={(e) => { e.stopPropagation(); deleteAlert(alert.properties.id); }}>Dismiss</button>
                    </div>

                    <div className="mt-3 flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                      <span className={alert.properties.activity_type.includes('deforestation') ? 'text-red' : 'text-warning'}>
                        Priority: {alert.properties.activity_type.includes('deforestation') ? 'Critical' : 'High'}
                      </span>
                      <div className="new-indicator-dot"></div>
                    </div>
                  </>
                )}
                {currentRole === 'Public' && (
                  <div className="mt-2 text-[10px] text-secondary italic">
                    Community Alert: Eco-monitoring active in this zone.
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        <div className="mt-2 px-4 pb-4">
          <button 
             onClick={handleDownloadReport}
             className="w-full py-2 bg-green-900/30 border border-green-500/50 text-[10px] font-bold uppercase hover:bg-green-500 hover:text-white text-green-400 transition-all rounded flex items-center justify-center gap-2"
           >
             <Download size={14} /> Download Impact Report
           </button>
        </div>
      </aside>
      
      <main className="map-area flex w-full h-full relative">
        <div className={compareMode ? "w-1/2 h-full relative border-r border-white/20" : "w-full h-full relative"}>
          {compareMode && <div className="absolute top-4 left-4 z-[1000] glass-panel px-3 py-1 text-xs font-bold text-white tracking-widest bg-black/50">PRESENT MAP</div>}
          <MapComponent 
            alerts={alerts} 
            watchZones={watchZones}
            onWatchZoneCreated={handleWatchZoneCreated} 
            onSelectZone={fetchSatelliteMetadata}
            onDeleteZone={deleteWatchZone}
            onCompareZone={handleCompareZone}
            selectedZoneId={selectedZone}
            selectedAlertId={selectedAlert?.id || null}
            predictionVisible={predictionVisible}
            role={currentRole}
            isLiveMap={!compareMode}
          />
        </div>
        
        {compareMode && (
          <div className="w-1/2 h-full relative bg-spectra-black">
             <div className="absolute top-4 right-4 z-[1000] glass-panel px-3 py-1 text-[11px] font-bold text-green-400 tracking-widest bg-black/50 border border-green-500/30">LIVE SATELLITE MAP</div>
             <MapComponent 
              alerts={alerts} 
              watchZones={watchZones}
              onWatchZoneCreated={handleWatchZoneCreated} 
              onSelectZone={fetchSatelliteMetadata}
              onDeleteZone={deleteWatchZone}
              onCompareZone={handleCompareZone}
              selectedZoneId={selectedZone}
              selectedAlertId={selectedAlert?.id || null}
              predictionVisible={predictionVisible}
              role={currentRole}
              isLiveMap={true}
            />
          </div>
        )}
      </main>

      <div className="tools-panel">
          <>
            <div className="panel-header">
              <span className="panel-title">Satellite Intelligence</span>
              <Satellite size={16} className="text-blue" />
            </div>
            
            <div className="satellite-widget glass-panel">
              <h4 className="text-xs font-bold uppercase tracking-widest mb-2">Latest Sentinel-2 Task</h4>
              {isScanning ? (
                <div className="text-center py-4">
                  <div className="animate-pulse text-blue text-xs uppercase italic">Executing Remote Scan...</div>
                </div>
              ) : satelliteMetadata ? (
                <div className="space-y-3">
                  <div className="widget-item">
                    <span className="widget-label">Capture Date</span>
                    <span className="widget-value">{new Date(satelliteMetadata.captured_at).toLocaleDateString()}</span>
                  </div>
                  {currentRole === 'Government' && (
                    <div className="widget-item">
                      <span className="widget-label">Cloud Cover</span>
                      <span className="widget-value">{satelliteMetadata.cloud_cover?.toFixed(1)}%</span>
                    </div>
                  )}
                  <div className="widget-item">
                    <span className="widget-label">Sensor Type</span>
                    <span className="widget-value">Optical (MSI)</span>
                  </div>
                  <button 
                    className="w-full mt-2 py-2 bg-blue-900/30 border border-blue-500/50 text-[10px] font-bold uppercase hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
                    onClick={handleDownloadCaptureData}
                    disabled={isGeneratingReport}
                  >
                    {isGeneratingReport ? <Activity size={14} className="animate-spin" /> : <Download size={14} />}
                    {isGeneratingReport ? 'Generating Report...' : 'Download Full Capture Data'}
                  </button>
                </div>
              ) : (
                <div className="text-xs text-secondary italic">Select or create a watch zone to retrieve satellite metadata.</div>
              )}
            </div>
          </>

        <div className="panel-header mt-4">
          <span className="panel-title">{currentRole === 'Public' ? 'Community Impact' : 'Inference Engine'}</span>
          <Maximize2 size={16} className="text-secondary" />
        </div>
        <div className="p-4 glass-panel text-[11px] leading-relaxed">
           <div className="flex justify-between mb-3">
             <span className="text-secondary">AI Status:</span>
             <span className="text-green font-bold animate-pulse">● ACTIVE</span>
           </div>
           
           {currentRole !== 'Public' && (
             <>
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
              <Activity size={14} /> Inference Engine {selectedAlert ? '(Alert context)' : '(Zone context)'}
            </h3>
            
            <div className="section-divider mb-4"></div>

               <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary flex items-center gap-1"><TrendingDown size={12} /> Veg. Change</span>
                    <span className="text-red font-mono">
                      {selectedAlert ? selectedAlert.veg_loss : (satelliteMetadata?.inference?.veg_loss || 'Select AOI...')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary flex items-center gap-1"><Droplets size={12} /> Soil Status</span>
                    <span className="text-blue font-mono">
                      {selectedAlert ? selectedAlert.soil_moisture : (satelliteMetadata?.inference?.soil_moisture || 'Select AOI...')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary flex items-center gap-1"><Activity size={12} /> Activity</span>
                    <span className="text-primary font-bold">
                      {selectedAlert ? selectedAlert.activity_type.replace('_', ' ') : (satelliteMetadata?.inference?.activity || 'Select AOI...')}
                    </span>
                  </div>
               </div>
             </>
           )}

           <div className="section-divider mb-3"></div>

           <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue mb-2">Impact Metrics</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="stat-card">
                <div className="stat-card-value">
                  {selectedAlert ? `~${selectedAlert.impact_trees}` : (satelliteMetadata?.inference?.impact_trees ? `~${satelliteMetadata.inference.impact_trees}` : '--')}
                </div>
                <div className="stat-card-label">Trees Lost</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value text-orange">
                  {selectedAlert ? `${selectedAlert.impact_area} ha` : (satelliteMetadata?.inference?.impact_area ? `${satelliteMetadata.inference.impact_area} ha` : '--')}
                </div>
                <div className="stat-card-label">Area (ha)</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value text-blue">
                  {selectedAlert ? `${selectedAlert.impact_co2} t` : (satelliteMetadata?.inference?.impact_co2 ? `${satelliteMetadata.inference.impact_co2} t` : '--')}
                </div>
                <div className="stat-card-label">CO2 Impact</div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default App;
