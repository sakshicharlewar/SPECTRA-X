import React from 'react';
import GlassPanel from './GlassPanel';
import { Activity } from 'lucide-react';

const Header = () => {
  return (
    <GlassPanel 
      className="absolute top-6 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] px-6 py-4 flex items-center justify-between z-20 pointer-events-auto"
      delay={0.1}
      yOffset={4}
    >
      <div className="flex items-center space-x-3">
        {/* Logo indicator */}
        <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          <div className="w-3 h-3 rounded-full bg-white animate-pulse"></div>
        </div>
        <h1 className="text-xl font-medium tracking-[0.2em] text-white">
          SPECTRA<span className="text-spectra-teal">X</span>
        </h1>
      </div>
      
      <div className="flex items-center space-x-3 px-4 py-1.5 rounded-full bg-black/40 border border-white/5">
        <div className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-spectra-teal opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-spectra-teal shadow-[0_0_8px_#00f2ff]"></span>
        </div>
        <span className="text-xs font-mono text-spectra-teal uppercase tracking-wider">
          System Online
        </span>
        <Activity size={14} className="text-spectra-teal ml-2" />
      </div>
    </GlassPanel>
  );
};

export default Header;
