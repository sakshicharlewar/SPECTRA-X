import React from 'react';
import { motion } from 'framer-motion';

const GlassPanel = ({ children, className = '', delay = 0, yOffset = 10, duration = 4 }) => {
  return (
    <motion.div
      initial={{ y: 0, opacity: 0 }}
      animate={{ 
        y: [0, -yOffset, 0],
        opacity: 1
      }}
      transition={{
        y: {
          duration: duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: delay
        },
        opacity: { duration: 0.8 }
      }}
      className={`backdrop-blur-lg bg-black/40 border border-white/10 shadow-2xl rounded-3xl overflow-hidden ${className}`}
    >
      {/* Subtle top glare effect for "glass" feel */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      {children}
    </motion.div>
  );
};

export default GlassPanel;
