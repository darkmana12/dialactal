
// FIX: Import React and hooks.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// FIX: Use ES module imports for all dependencies.
import { fetchRandomArticle } from './services/wikipediaService.ts';
import { processArticleContent, normalizeWord } from './utils/textProcessor.ts';
import { verbConjugations } from './utils/verbConjugations.ts';
import { RELATED_WORDS_DB, SEMANTIC_CATEGORIES } from './constants.ts';
import { GameBoard } from './components/GameBoard.tsx';
import { GuessInput } from './components/GuessInput.tsx';
import { GuessedWordsList } from './components/GuessedWordsList.tsx';
import { GameInfoPanel } from './components/GameInfoPanel.tsx';
import { LoadingSpinner } from './components/LoadingSpinner.tsx';
import { WinModal } from './components/WinModal.tsx';
import { ShootingGalleryGame } from './components/ShootingGalleryGame.tsx';
import type { GameState, ProcessedWord, GuessedWord } from './types.ts';

export const App = () => {
  // FIX: Add explicit types for all state variables.
  const [gameState, setGameState] = useState<GameState>('LOADING');
  const [articleTitle, setArticleTitle] = useState('');
  const [articleUrl, setArticleUrl] = useState('');
  const [processedContent, setProcessedContent] = useState<ProcessedWord[]>([]);
  const [guessedWords, setGuessedWords] = useState<Map<string, GuessedWord>>(new Map());
  const [guessCount, setGuessCount] = useState(0);
  const [titleWords, setTitleWords] = useState<Set<string>>(new Set());
  const [guessHistory, setGuessHistory] = useState<string[]>([]);
  const [relatedWordsMap, setRelatedWordsMap] = useState<Map<string, string>>(new Map());
  const [categoryMap, setCategoryMap] = useState<Map<string, Set<string>>>(new Map());
  const [loadingMessage, setLoadingMessage] = useState('');
  const [totalUniqueWords, setTotalUniqueWords] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(true);
  
  const startNewGame = useCallback(async () => {
    setGameState('LOADING');
    setIsModalOpen(true);
    setLoadingMessage("Recherche d'un article Wikipédia aléatoire...");
    setGuessedWords(new Map());
    setGuessCount(0);
    setTitleWords(new Set());
    setGuessHistory([]);
    setRelatedWordsMap(new Map());
    setCategoryMap(new Map());

    try {
      const article = await fetchRandomArticle();
      if (article) {
        setArticleTitle(article.title);
        setArticleUrl(article.url);
        const normalizedTitleWords = new Set(
          article.title
            .split(' ')
            .map(normalizeWord)
            .filter(w => w.length > 0)
        );
        setTitleWords(normalizedTitleWords);
        const processed = processArticleContent(article.content);
        
        setLoadingMessage("Analyse sémantique des mots...");

        const hiddenWordsArray = Array.from(new Set(
            processed
                .filter(w => w.hidden && !w.isPunctuation)
                .map(w => normalizeWord(w.original))
        ));
        setTotalUniqueWords(hiddenWordsArray.length);

        const newRelatedWordsMap = new Map<string, string>();
        for (const clue in RELATED_WORDS_DB) {
            const target = RELATED_WORDS_DB[clue];
            if (hiddenWordsArray.includes(target)) {
                newRelatedWordsMap.set(normalizeWord(clue), target);
            }
        }
        setRelatedWordsMap(newRelatedWordsMap);

        const newCategoryMap = new Map<string, Set<string>>();
        for (const category of SEMANTIC_CATEGORIES) {
          for (const word of category) {
            newCategoryMap.set(word, category);
          }
        }
        setCategoryMap(newCategoryMap);

        setLoadingMessage("Initialisation du plateau de jeu...");
        await new Promise(resolve => setTimeout(resolve, 50));

        setProcessedContent(processed);
        setGameState('PLAYING');
      } else {
        throw new Error("Failed to fetch article.");
      }
    } catch (error) {
      // FIX: The 'error' object in a catch block is of type 'unknown' and cannot be passed directly to a function expecting a string. Safely convert it to a string before logging.
      console.error('Error starting new game:', String(error));
      setGameState('ERROR');
    }
  }, []);

  useEffect(() => {
    startNewGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const foundWordsCount = useMemo(() => {
    return Array.from(guessedWords.values()).filter((w) => w.found).length;
  }, [guessedWords]);

  const handleGuess = (guess: string) => {
    const trimmedGuess = guess.trim();
    if (!trimmedGuess || gameState !== 'PLAYING') return;

    setGuessHistory((prev) => [trimmedGuess, ...prev]);

    const normalizedGuess = normalizeWord(trimmedGuess);
    
    // FIX: Safely check if the word has already been found to avoid errors.
    // An explicit type assertion is used here to address a potential type inference issue where .get() might return `unknown`.
    const existingGuess = guessedWords.get(normalizedGuess) as GuessedWord | undefined;
    if (existingGuess?.found) {
        return;
    }

    setGuessCount((prev) => prev + 1);

    let currentContent = [...processedContent];
    let wordFound = false;

    const wordsToRevealDirectly = new Set([normalizedGuess]);
    
    // Also check for the singular form if the guess ends in 's'
    if (normalizedGuess.endsWith('s') && normalizedGuess.length > 1) {
      wordsToRevealDirectly.add(normalizedGuess.slice(0, -1));
    }
    
    wordsToRevealDirectly.add(normalizedGuess + 's');

    if (normalizedGuess.endsWith('al') && normalizedGuess.length > 2) {
        wordsToRevealDirectly.add(normalizedGuess.slice(0, -2) + 'aux');
    } else if ((normalizedGuess.endsWith('au') || normalizedGuess.endsWith('eu')) && normalizedGuess.length > 2) {
        wordsToRevealDirectly.add(normalizedGuess + 'x');
    }

    const conjugations = verbConjugations.get(normalizedGuess);
    if (conjugations) {
      conjugations.forEach((conj) => wordsToRevealDirectly.add(conj));
    }

    let directMatchCount = 0;
    const tempContent = currentContent.map((word) => {
        const normalizedOriginal = normalizeWord(word.original);
        const isRevealable = word.hidden || word.isCloseGuess;
        if (isRevealable && wordsToRevealDirectly.has(normalizedOriginal)) {
            wordFound = true;
            directMatchCount++;
            return { ...word, hidden: false, isCloseGuess: false, displayAs: undefined, closestGuessDistance: undefined };
        }
        return word;
    });

    const newGuessedWords = new Map(guessedWords);

    if (wordFound) {
        currentContent = tempContent;
        // FIX: An explicit type assertion is used here to address a potential type inference issue where .get() might return `unknown`.
        const existing = newGuessedWords.get(normalizedGuess) as GuessedWord | undefined;
        newGuessedWords.set(normalizedGuess, {
            found: true,
            count: (existing?.count || 0) + directMatchCount,
            isTitle: titleWords.has(normalizedGuess),
            isSynonym: false,
        });
    } else {
        let wasCloseGuess = false;
        
        const guessAsNumber = parseInt(normalizedGuess, 10);
        const isNumericGuess = !isNaN(guessAsNumber) && /^\d+$/.test(normalizedGuess);

        if (isNumericGuess) {
            let madeUpdate = false;
            currentContent = currentContent.map((word) => {
                const originalAsNumber = parseInt(word.original, 10);
                if ((word.hidden || word.isCloseGuess) && !isNaN(originalAsNumber)) {
                    const distance = Math.abs(originalAsNumber - guessAsNumber);
                    if (word.closestGuessDistance === undefined || distance < word.closestGuessDistance) {
                        madeUpdate = true;
                        return { ...word, hidden: false, isCloseGuess: true, displayAs: trimmedGuess, closestGuessDistance: distance };
                    }
                }
                return word;
            });
            if (madeUpdate) wasCloseGuess = true;
        } else {
            const relatedTo = relatedWordsMap.get(normalizedGuess);
            const category = categoryMap.get(normalizedGuess);
            let foundStaticRelation = false;

            if (relatedTo || category) {
                currentContent = currentContent.map((word) => {
                    if (word.hidden) {
                        const normalizedOriginal = normalizeWord(word.original);
                        const isRelated = relatedTo && normalizedOriginal === relatedTo;
                        const inCategory = category && category.has(normalizedOriginal);
                        if (isRelated || inCategory) {
                            foundStaticRelation = true;
                            return { ...word, hidden: false, isCloseGuess: true, displayAs: trimmedGuess };
                        }
                    }
                    return word;
                });
            }

            if (foundStaticRelation) {
                wasCloseGuess = true;
            }
        }
        
        newGuessedWords.set(normalizedGuess, { 
            found: false, 
            count: 0, 
            isTitle: false, 
            isSynonym: wasCloseGuess 
        });
    }

    setGuessedWords(newGuessedWords);
    setProcessedContent(currentContent);

    const allTitleWordsFound = titleWords.size > 0 && Array.from(titleWords).every(titleWord => {
        // FIX: An explicit type assertion is used here to address a potential type inference issue where .get() might return `unknown`.
        const data = newGuessedWords.get(titleWord) as GuessedWord | undefined;
        return !!data?.found;
    });

    if (allTitleWordsFound) {
        setIsModalOpen(true);
        setGameState('WON');
        const finalContent = currentContent.map((word) => {
            if (word.hidden && titleWords.has(normalizeWord(word.original))) {
                return { ...word, hidden: false, isCloseGuess: false };
            }
            return word;
        });
        setProcessedContent(finalContent);
    }
  };

  const handleReveal = useCallback(() => {
    if (gameState !== 'PLAYING') return;

    const revealedContent = processedContent.map(word => ({
      ...word,
      hidden: false,
      isCloseGuess: false,
    }));
    setProcessedContent(revealedContent);
    setGameState('REVEALED');
    setIsModalOpen(true);
  }, [gameState, processedContent]);
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="relative min-h-screen">
      
      {gameState === 'LOADING' && (
        <div className="absolute inset-0 bg-brand-bg/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
            <ShootingGalleryGame />
            <LoadingSpinner message={loadingMessage} />
        </div>
      )}
      
      {gameState === 'ERROR' && (
        <div className="flex items-center justify-center h-screen">
          <p className="text-center text-brand-accent-red text-lg">Impossible de charger un article. Veuillez réessayer.</p>
        </div>
      )}

      {(gameState === 'PLAYING' || gameState === 'WON' || gameState === 'REVEALED') && (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <aside className="lg:col-span-1 flex flex-col gap-6">
            <GameInfoPanel
              guessCount={guessCount}
              // FIX: Corrected typo from `startNewGMame` to `startNewGame`.
              onNewGame={startNewGame}
              onReveal={handleReveal}
              disabled={gameState !== 'PLAYING'}
            />
            <GuessedWordsList guessHistory={guessHistory} />
          </aside>

          <main className="lg:col-span-3 flex flex-col gap-6">
            <GuessInput 
              onGuess={handleGuess}
              disabled={gameState !== 'PLAYING'}
            />
            <GameBoard
              content={processedContent}
              title={articleTitle}
              guessedWords={guessedWords}
            />
          </main>
        </div>
      )}

      {(gameState === 'WON' || gameState === 'REVEALED') && isModalOpen && (
        <WinModal
          gameState={gameState}
          title={articleTitle}
          url={articleUrl}
          guessCount={guessCount}
          onPlayAgain={startNewGame}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
