import React, { useState, useEffect, useCallback } from 'react';

const ShootingGalleryGame = () => {
  const [targets, setTargets] = useState<{ id: number; x: number; y: number }[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const spawnInterval = setInterval(() => {
      setTargets(prevTargets => {
        if (prevTargets.length >= 10) {
          return prevTargets;
        }
        const newTarget = {
          id: Date.now(),
          x: Math.random() * 90,
          y: Math.random() * 90,
        };
        return [...prevTargets, newTarget];
      });
    }, 800);

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