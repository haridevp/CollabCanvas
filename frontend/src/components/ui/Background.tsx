import React from 'react';
import DotGrid from '../DotGrid';

const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 w-full h-full overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      <DotGrid
        dotSize={10}
        gap={26}
        baseColor="transparent"
        activeColor="#0d9488"
        proximity={150}
        speedTrigger={10}
        shockRadius={50}
        shockStrength={1}
        maxSpeed={1000}
        resistance={100}
        returnDuration={1}
        className="w-full h-full"
      />
    </div>
  );
};

export default Background;
