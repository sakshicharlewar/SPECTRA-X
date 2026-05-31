import React from 'react';
import MapCanvas from './components/MapCanvas';
import Header from './components/Header';
import AlertFeed from './components/AlertFeed';
import ControlCenter from './components/ControlCenter';
import BottomKPIBar from './components/BottomKPIBar';
import ActionBtn from './components/ActionBtn';

function App() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-spectra-black font-sans text-white">
      {/* Background Map layer */}
      <MapCanvas />
      
      {/* UI Overlay layer - pointer-events-none allows clicks to pass through to the map */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <Header />
        <AlertFeed />
        <ControlCenter />
        <BottomKPIBar />
        <ActionBtn />
      </div>
    </div>
  );
}

export default App;
