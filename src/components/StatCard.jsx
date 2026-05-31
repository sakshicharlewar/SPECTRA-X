import React from 'react';

const StatCard = ({ icon: Icon, label, value, unit, color = "text-spectra-teal" }) => {
  return (
    <div className="flex flex-col space-y-1">
      <div className="flex items-center space-x-2 text-white/50 text-xs tracking-widest uppercase">
        {Icon && <Icon size={14} />}
        <span>{label}</span>
      </div>
      <div className="flex items-baseline space-x-1">
        <span className={`text-3xl font-light tracking-tighter ${color} drop-shadow-[0_0_8px_rgba(0,242,255,0.5)]`}>
          {value}
        </span>
        {unit && <span className="text-white/40 text-sm ml-1">{unit}</span>}
      </div>
    </div>
  );
};

export default StatCard;
