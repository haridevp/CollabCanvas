import React from 'react';
import DotGrid from '../DotGrid';

const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 w-full h-full overflow-hidden bg-black">
      <DotGrid
        dotSize={10}
        gap={26}
        baseColor="#0000ff"
        activeColor="#ff0000"
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
