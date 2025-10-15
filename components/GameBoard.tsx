import React from 'react';
import type { ProcessedWord, GuessedWord } from '../types';
import { normalizeWord } from '../utils/textProcessor';

interface GameBoardProps {
  content: ProcessedWord[];
  title: string;
  guessedWords: Map<string, GuessedWord>;
}

const GameBoard: React.FC<GameBoardProps> = ({ content, title, guessedWords }) => {
  return (
    <div className="text-lg leading-relaxed bg-white p-4 sm:p-6 rounded-2xl whitespace-pre-wrap border-2 border-brand-border h-full overflow-y-auto">
      {/* Title display */}
      <div className="text-center mb-6 pb-4 border-b-2 border-brand-secondary/80">
        <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1">
          {title.split(' ').map((word, index) => {
            const normalized = normalizeWord(word);
            const isFound = guessedWords.has(normalized) && guessedWords.get(normalized)!.found;

            if (isFound) {
              return (
                <span key={index} className="text-2xl font-bold text-brand-primary animate-reveal-word rounded-sm px-0.5 -mx-0.5">
                  {word}
                </span>
              );
            } else {
              return (
                <span
                  key={index}
                  className="bg-brand-hidden-word text-transparent rounded-sm text-2xl font-bold"
                  style={{ userSelect: 'none' }}
                >
                  {word}
                </span>
              );
            }
          })}
        </div>
      </div>

      {/* Article content */}
      <div>
        {content.map((word, index) => {
          if (word.isPunctuation) {
            return <span key={index}>{word.original}</span>;
          }
          if (word.hidden) {
            return (
              <span
                key={index}
                className="bg-brand-hidden-word text-transparent rounded-sm cursor-default"
                style={{ userSelect: 'none' }}
              >
                {word.original}
              </span>
            );
          }
          if (word.isCloseGuess && word.displayAs) {
            return (
               <span 
                key={index} 
                className="inline-block bg-yellow-300/80 text-yellow-900 italic font-semibold text-sm rounded-sm px-1 mx-px align-baseline"
              >
                {word.displayAs}
              </span>
            );
          }
          return (
            <span key={index} className="text-brand-primary font-semibold animate-reveal-word rounded-sm px-0.5 -mx-0.5">
              {word.original}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default GameBoard;