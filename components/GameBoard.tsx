import { normalizeWord } from '../utils/textProcessor';
import type { ProcessedWord, GuessedWord } from '../types';

const GameBoard = ({ content, title, guessedWords }: { content: ProcessedWord[], title: string, guessedWords: Map<string, GuessedWord> }) => {
  return (
    <div className="text-lg leading-relaxed bg-white text-[#111827] p-4 sm:p-6 rounded-2xl whitespace-pre-wrap border-2 border-brand-border h-full overflow-y-auto">
      {/* Title display */}
  <div className="text-center mb-6 pb-4 border-b-2 border-gray-200">
        <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1">
          {title.split(' ').map((word, index) => {
            const normalized = normalizeWord(word);
            const isFound = guessedWords.has(normalized) && guessedWords.get(normalized)?.found;
            if (isFound) {
              return (
                <span key={index} className="text-2xl font-bold text-[#111827] animate-reveal-word rounded-sm px-0.5 -mx-0.5">
                  {word}
                </span>
              );
            } else {
              return (
                <span
                  key={index}
                  className="bg-gray-300 text-transparent rounded-sm text-2xl font-bold"
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
                className="bg-gray-300 text-transparent rounded-sm cursor-default"
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
                className="inline-block bg-gray-200 text-gray-600 italic rounded-sm px-0.5 -mx-0.5 align-baseline"
              >
                {word.displayAs}
              </span>
            );
          }
          return (
            <span key={index} className="font-semibold animate-reveal-word rounded-sm px-0.5 -mx-0.5">
              {word.original}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default GameBoard;