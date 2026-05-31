import React, { useState } from 'react';
import GlassPanel from './GlassPanel';
import { Layers, Eye, Radio, Shield } from 'lucide-react';

const ToggleSwitch = ({ label, icon: Icon, defaultChecked = false }) => {
  const [active, setActive] = useState(defaultChecked);
  
  return (
    <div 
      className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5"
      onClick={() => setActive(!active)}
    >
      <div className="flex items-center space-x-3">
        <div className={`p-1.5 rounded-lg ${active ? 'bg-spectra-teal/10 text-spectra-teal' : 'bg-white/5 text-white/40'}`}>
          <Icon size={16} />
        </div>
        <span className={`text-sm ${active ? 'text-white' : 'text-white/60'} font-medium`}>{label}</span>
      </div>
      
      <div className={`w-8 h-4 rounded-full relative transition-colors ${active ? 'bg-spectra-teal/30' : 'bg-white/10'}`}>
        <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform ${active ? 'bg-spectra-teal translate-x-4 shadow-[0_0_8px_#00f2ff]' : 'bg-white/50 translate-x-0.5'}`}></div>
      </div>
    </div>
  );
};

const ControlCenter = () => {
  return (
    <GlassPanel 
      className="absolute top-24 left-6 w-72 flex flex-col z-20 pointer-events-auto"
      delay={0.4}
      yOffset={6}
      duration={4.5}
    >
      <div className="p-5 border-b border-white/10 flex items-center space-x-2">
        <Layers size={18} className="text-white/60" />
        <h2 className="text-sm font-medium tracking-widest text-white/80 uppercase">Control Center</h2>
      </div>
      
      <div className="p-4 flex flex-col space-y-2">
        <ToggleSwitch label="Radar (SAR)" icon={Radio} defaultChecked={true} />
        <ToggleSwitch label="Optical Layers" icon={Eye} defaultChecked={false} />
        <ToggleSwitch label="Legal Boundaries" icon={Shield} defaultChecked={true} />
      </div>
      
      <div className="mt-2 p-4 pt-0">
        <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col space-y-3">
            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Active Model</span>
            <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-spectra-teal shadow-[0_0_5px_#00f2ff]"></span>
                <span className="text-sm text-white font-mono">ChangeFormer ViT</span>
            </div>
            <span className="text-[10px] text-white/30 font-mono tracking-widest text-right">v4.2.0.xyz</span>
        </div>
      </div>
    </GlassPanel>
  );
};

export default ControlCenter;
