import React from 'react';

interface LoadingScreenProps {
  onEnter: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onEnter }) => {
  // Helper function to generate box-shadows for stars
  const generateStars = (count: number, width: number, height: number) => {
    let value = `${Math.random() * width}px ${Math.random() * height}px #FFF`;
    for (let i = 2; i <= count; i++) {
      value += `, ${Math.random() * width}px ${Math.random() * height}px #FFF`;
    }
    return value;
  };

  const stars1 = { boxShadow: generateStars(700, 2000, 2000) };
  const stars2 = { boxShadow: generateStars(200, 2000, 2000) };
  const stars3 = { boxShadow: generateStars(100, 2000, 2000) };

  return (
    <>
      <style>{`
        .night-sky {
          background: radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%);
          overflow: hidden;
        }

        @keyframes animStar {
          from { transform: translateY(0px); }
          to { transform: translateY(-2000px); }
        }

        .stars {
          position: absolute;
          top: 0;
          left: 0;
          width: 1px;
          height: 1px;
          background: transparent;
          animation: animStar 50s linear infinite;
        }
        .stars2 {
          width: 2px;
          height: 2px;
          animation: animStar 100s linear infinite;
        }
        .stars3 {
          width: 3px;
          height: 3px;
          animation: animStar 150s linear infinite;
        }

        .fade-in-up {
          animation: fadeInUp 1s ease-out forwards;
          opacity: 0;
        }

        .delay-1 { animation-delay: 0.5s; }
        .delay-2 { animation-delay: 0.8s; }
        .delay-3 { animation-delay: 1.1s; }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .glow-text {
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.3), 0 0 20px rgba(255, 255, 255, 0.2);
        }

        .ghost-button {
           background-color: transparent;
           border: 2px solid rgba(255, 255, 255, 0.5);
           color: rgba(255, 255, 255, 0.8);
           box-shadow: 0 0 15px rgba(255,255,255,0.1);
        }

        .ghost-button:hover {
           background-color: rgba(255, 255, 255, 0.1);
           color: #FFF;
           border-color: #FFF;
           box-shadow: 0 0 25px rgba(255,255,255,0.3);
        }
      `}</style>
      <div className="w-full h-full flex flex-col justify-center items-center font-sans night-sky relative">
        <div className="stars" style={stars1}></div>
        <div className="stars stars2" style={stars2}></div>
        <div className="stars stars3" style={stars3}></div>
        
        <div className="text-center p-8 z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white glow-text fade-in-up delay-1">
            Dynamic Sky Scene
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-lg fade-in-up delay-2">
            An interactive procedural sky and cloud simulation with Three.js & React.
          </p>
          <button
            onClick={onEnter}
            className="ghost-button font-semibold py-3 px-8 rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-200 focus:ring-opacity-50 fade-in-up delay-3"
          >
            Enter Scene
          </button>
        </div>
      </div>
    </>
  );
};

export default LoadingScreen;
