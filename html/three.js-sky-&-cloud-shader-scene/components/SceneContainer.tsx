
import React from 'react';
import ThreeScene from './ThreeScene';
import ColorControls from './ColorControls';
import type { SkyColors, CloudColors } from '../types';

interface SceneContainerProps {
  skyColors: SkyColors;
  setSkyColors: React.Dispatch<React.SetStateAction<SkyColors>>;
  cloudColors: CloudColors;
  setCloudColors: React.Dispatch<React.SetStateAction<CloudColors>>;
  lightsOn: boolean;
  setLightsOn: React.Dispatch<React.SetStateAction<boolean>>;
}

const SceneContainer: React.FC<SceneContainerProps> = (props) => {
  return (
    <div className="relative w-full h-full">
      <ThreeScene
        skyColors={props.skyColors}
        cloudColors={props.cloudColors}
        lightsOn={props.lightsOn}
      />
      <ColorControls {...props} />
    </div>
  );
};

export default SceneContainer;
