import React from 'react';
import GlassPanel from './GlassPanel';
import { Satellite, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const AlertFeed = () => {
  return (
    <GlassPanel 
      className="absolute top-24 right-6 w-80 h-[calc(100vh-12rem)] flex flex-col z-20 pointer-events-auto"
      delay={0.8}
      yOffset={8}
      duration={5}
    >
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-widest text-white/80 uppercase">Alert Feed</h2>
        <div className="w-2 h-2 rounded-full bg-spectra-teal shadow-[0_0_8px_#00f2ff] animate-pulse"></div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-spectra-teal/5 rounded-full blur-2xl"></div>

        <motion.div
           animate={{ rotate: 360 }}
           transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
           className="relative"
        >
          <div className="absolute inset-0 border border-spectra-teal/20 rounded-full scale-110"></div>
          <div className="absolute inset-0 border border-spectra-teal/10 border-dashed rounded-full scale-125"></div>
          <div className="w-16 h-16 rounded-full bg-spectra-teal/10 border border-spectra-teal/30 flex items-center justify-center relative backdrop-blur-md glow-effect">
            <Satellite size={24} className="text-spectra-teal" />
          </div>
        </motion.div>
        
        <div className="space-y-2 z-10">
          <p className="text-spectra-teal text-sm font-mono tracking-wider">
            Awaiting Telemetry
          </p>
          <p className="text-white/40 text-xs leading-relaxed max-w-[200px] mx-auto">
            No anomalous activity detected in current view matrix. Scanning operational.
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center space-x-2 text-white/30 text-xs bg-white/5 py-1.5 px-4 rounded-full border border-white/5 backdrop-blur-md">
            <ShieldCheck size={14} />
            <span>Sector Secure</span>
        </div>
      </div>
    </GlassPanel>
  );
};

export default AlertFeed;
