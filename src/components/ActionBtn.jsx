import React from 'react';
import { Crosshair } from 'lucide-react';
import { motion } from 'framer-motion';

const ActionBtn = () => {
  return (
    <motion.button 
      className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 group pointer-events-auto"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Pulse Rings */}
      <div className="absolute inset-0 rounded-full bg-spectra-teal opacity-20 group-hover:animate-ping duration-1000"></div>
      <div className="absolute -inset-2 rounded-full border border-spectra-teal/30 scale-110 opacity-50 group-hover:scale-125 transition-transform duration-700"></div>
      
      {/* Main Glass Button */}
      <div className="relative px-8 py-4 backdrop-blur-xl bg-spectra-teal/10 border border-spectra-teal/50 shadow-[0_0_30px_rgba(0,242,255,0.2)] rounded-full flex items-center space-x-3 overflow-hidden">
        {/* Shine effect */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        
        <Crosshair size={20} className="text-spectra-teal shadow-[0_0_10px_#00f2ff]" />
        <span className="text-white font-mono tracking-widest text-sm uppercase">
          Initialize Watch-Zone
        </span>
      </div>
    </motion.button>
  );
};

export default ActionBtn;
