import React, { useState, useEffect, useCallback } from 'react';

interface Target {
  id: number;
  x: number;
  y: number;
}

const ShootingGalleryGame: React.FC = () => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const spawnInterval = setInterval(() => {
      setTargets(prevTargets => {
        if (prevTargets.length >= 10) {
          // Limit the number of targets on screen
          return prevTargets;
        }
        const newTarget: Target = {
          id: Date.now(),
          x: Math.random() * 90, // % from left, 90 to keep it within bounds
          y: Math.random() * 90, // % from top
        };
        return [...prevTargets, newTarget];
      });
    }, 800); // Spawn a new target every 800ms

    return () => clearInterval(spawnInterval);
  }, []);

  const handleTargetClick = useCallback((targetId: number) => {
    setTargets(prevTargets => prevTargets.filter(t => t.id !== targetId));
    setScore(prevScore => prevScore + 10);
  }, []);

  return (
    <div className="w-full max-w-lg h-64 bg-slate-700/50 rounded-lg relative overflow-hidden border-2 border-brand-border mb-4">
      <div className="absolute top-2 left-3 text-white font-bold z-10">
        <span className="text-sm">Score:</span> {score}
      </div>
       <div className="absolute top-2 right-3 text-white/70 font-semibold z-10 text-sm">
        Cliquez sur les cibles !
      </div>

      {targets.map(target => (
        <button
          key={target.id}
          className="absolute w-10 h-10 bg-red-500 rounded-full cursor-pointer animate-pop-in transition-transform duration-100 ease-out active:scale-90"
          style={{
            left: `${target.x}%`,
            top: `${target.y}%`,
            boxShadow: '0 0 0 4px white, 0 0 0 8px #F3684A',
          }}
          onClick={() => handleTargetClick(target.id)}
          aria-label="Cible"
        />
      ))}
    </div>
  );
};

export default ShootingGalleryGame;