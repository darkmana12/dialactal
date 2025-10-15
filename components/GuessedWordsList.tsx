import React from 'react';

interface GuessedWordsListProps {
  guessHistory: string[];
}

const GuessedWordsList: React.FC<GuessedWordsListProps> = ({ guessHistory }) => {
  return (
    <div className="bg-white p-4 rounded-2xl border-2 border-brand-border h-[45vh] flex flex-col">
      <h3 className="font-bold text-lg mb-4 text-brand-primary">Mots Essayés</h3>
      <div className="overflow-y-auto flex-grow">
        <div className="flex flex-col items-start gap-1">
          {guessHistory.map((word, index) => (
            <span 
              key={index} 
              className="text-gray-700 text-base"
            >
              {word}
            </span>
          ))}
          {guessHistory.length === 0 && (
            <p className="text-gray-500 italic">Aucun mot essayé pour le moment.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuessedWordsList;