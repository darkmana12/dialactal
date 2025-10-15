import React from 'react';
import type { GameState } from '../types.ts';
import CloseIcon from './icons/CloseIcon.tsx';

interface WinModalProps {
  gameState: GameState;
  title: string;
  url: string;
  guessCount: number;
  onPlayAgain: () => void;
  onClose: () => void;
}

const WinModal: React.FC<WinModalProps> = ({ gameState, title, url, guessCount, onPlayAgain, onClose }) => {
  if (gameState !== 'WON' && gameState !== 'REVEALED') return null;

  const isWin = gameState === 'WON';
  const headerText = isWin ? 'Félicitations !' : 'Réponse révélée';
  const headerColor = isWin ? 'text-green-600' : 'text-brand-accent-red';
  const message = isWin
    ? `Vous avez trouvé le titre en ${guessCount} essais !`
    : 'Plus de chance la prochaine fois !';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full text-center border-2 border-brand-border">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 rounded-full text-gray-500 hover:bg-gray-200 focus:outline-none"
          aria-label="Fermer"
        >
          <CloseIcon />
        </button>
        <h2 className={`text-3xl font-bold mb-2 ${headerColor}`}>{headerText}</h2>
        <p className="text-lg text-brand-primary/80 mb-4">{message}</p>
        <div className="bg-brand-secondary/50 p-4 rounded-lg border border-brand-primary/50 mb-6">
          <p className="text-sm text-gray-600">L'article était :</p>
          <h3 className="text-2xl font-semibold text-brand-primary my-1">{title}</h3>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 hover:underline"
          >
            Lire sur Wikipédia &rarr;
          </a>
        </div>
        <button
          onClick={onPlayAgain}
          className="w-full bg-brand-accent-red hover:brightness-105 text-white font-bold py-3 px-4 rounded-xl transition-transform duration-100 ease-out text-lg border-2 border-brand-primary active:scale-95"
        >
          Rejouer
        </button>
      </div>
    </div>
  );
};

export default WinModal;