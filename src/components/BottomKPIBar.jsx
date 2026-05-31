import React from 'react';
import GlassPanel from './GlassPanel';
import StatCard from './StatCard';
import { Target, Frame, Radar } from 'lucide-react';

const BottomKPIBar = () => {
  return (
    <GlassPanel 
      className="absolute bottom-6 left-6 right-6 h-24 z-10 flex items-center justify-between px-10 pointer-events-auto"
      delay={1.2}
      yOffset={3}
      duration={6}
    >
      <div className="flex space-x-16">
        <StatCard 
          icon={Target} 
          label="Active Alerts" 
          value="0" 
          color="text-white/70" // Kept neutral since it's 0
        />
        <StatCard 
          icon={Frame} 
          label="Coverage" 
          value="0" 
          unit="sq km" 
          color="text-white/70"
        />
      </div>
      
      <div className="flex space-x-16">
         <div className="flex flex-col space-y-1 items-end pt-2">
           <div className="flex items-center space-x-2 text-white/50 text-xs tracking-widest uppercase mb-1">
             <Radar size={14} />
             <span>Engine Status</span>
           </div>
           <div className="flex items-center space-x-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-spectra-teal opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-spectra-teal opacity-100"></span>
             </span>
             <span className="text-spectra-teal text-sm font-mono uppercase tracking-wider">Scanning</span>
           </div>
         </div>
      </div>
    </GlassPanel>
  );
};

export default BottomKPIBar;
