import React from 'react';
import Shuffle from '../Shuffle';

const TitleAnimation: React.FC = () => {
    return (
        <Shuffle
            text="COLLABCANVAS"
            shuffleDirection="right"
            duration={0.35}
            animationMode="evenodd"
            shuffleTimes={1}
            ease="power3.out"
            stagger={0.03}
            threshold={0.1}
            triggerOnce={true}
            triggerOnHover
            respectReducedMotion={true}
            loop={false}
            loopDelay={0}
            tag="h1"
            className="text-7xl md:text-8xl font-black tracking-tighter text-white"
            style={{
                WebkitTextStroke: '2px black',
                textShadow: '4px 4px 0px rgba(0,0,0,0.5)'
            }}
        />
    );
};

export default TitleAnimation;
