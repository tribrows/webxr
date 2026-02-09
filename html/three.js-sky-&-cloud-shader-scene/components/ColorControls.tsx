
import React, { useState } from 'react';
import type { SkyColors, CloudColors } from '../types';

interface ColorControlsProps {
  skyColors: SkyColors;
  setSkyColors: React.Dispatch<React.SetStateAction<SkyColors>>;
  cloudColors: CloudColors;
  setCloudColors: React.Dispatch<React.SetStateAction<CloudColors>>;
  lightsOn: boolean;
  setLightsOn: React.Dispatch<React.SetStateAction<boolean>>;
}

const ColorInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <label className="text-sm text-gray-300">{label}</label>
    <input
      type="color"
      value={value}
      onChange={onChange}
      className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"
      style={{'backgroundColor': 'transparent'}}
    />
  </div>
);

const ColorControls: React.FC<ColorControlsProps> = ({
  skyColors,
  setSkyColors,
  cloudColors,
  setCloudColors,
  lightsOn,
  setLightsOn,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="absolute top-4 left-4 font-sans">
      <div className={`bg-gray-800 bg-opacity-80 backdrop-blur-sm text-white p-4 rounded-lg shadow-2xl transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-12'}`}>
        <div className="flex justify-between items-center">
          {isOpen && <h2 className="text-lg font-bold">Controls</h2>}
          <button onClick={() => setIsOpen(!isOpen)} className="text-white hover:text-gray-300 focus:outline-none">
            {isOpen ? '‹' : '›'}
          </button>
        </div>
        
        {isOpen && (
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-200 mb-2 border-b border-gray-600 pb-1">Sky</h3>
              <div className="space-y-2 mt-2">
                <ColorInput label="Top Color" value={skyColors.top} onChange={(e) => setSkyColors(prev => ({ ...prev, top: e.target.value }))} />
                <ColorInput label="Bottom Color" value={skyColors.bottom} onChange={(e) => setSkyColors(prev => ({ ...prev, bottom: e.target.value }))} />
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-200 mb-2 border-b border-gray-600 pb-1">Clouds</h3>
              <div className="space-y-2 mt-2">
                <ColorInput label="Shadow Color" value={cloudColors.color1} onChange={(e) => setCloudColors(prev => ({ ...prev, color1: e.target.value }))} />
                <ColorInput label="Mid Color" value={cloudColors.color2} onChange={(e) => setCloudColors(prev => ({ ...prev, color2: e.target.value }))} />
                <ColorInput label="Highlight Color" value={cloudColors.color3} onChange={(e) => setCloudColors(prev => ({ ...prev, color3: e.target.value }))} />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-200 mb-2 border-b border-gray-600 pb-1">Scene</h3>
              <div className="flex items-center justify-between mt-2">
                 <label htmlFor="lights-toggle" className="text-sm text-gray-300">Lights</label>
                 <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" name="lights-toggle" id="lights-toggle" checked={lightsOn} onChange={() => setLightsOn(!lightsOn)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                    <label htmlFor="lights-toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer"></label>
                 </div>
                 <style>{`
                    .toggle-checkbox:checked { right: 0; border-color: #4A90E2; }
                    .toggle-checkbox:checked + .toggle-label { background-color: #4A90E2; }
                 `}</style>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorControls;
