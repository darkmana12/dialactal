
import React, { useState, useEffect, useCallback } from 'react';
import { fetchRandomArticle } from './services/wikipediaService';
import { processArticleContent, normalizeWord, generateMorphoVariants, levenshtein } from './utils/textProcessor';
import { verbConjugations } from './utils/verbConjugations';
import { RELATED_WORDS_DB, SEMANTIC_CATEGORIES } from './constants';
import GameBoard from './components/GameBoard';
import GuessInput from './components/GuessInput';
import GuessedWordsList from './components/GuessedWordsList';
import GameInfoPanel from './components/GameInfoPanel';
import LoadingSpinner from './components/LoadingSpinner';
import PopBubbles from './components/minigames/PopBubbles';
import WinModal from './components/WinModal';
import type { GameState, ProcessedWord, GuessedWord } from './types';

const App = () => {

  const [gameState, setGameState] = useState<GameState>('LOADING');
  const [articleTitle, setArticleTitle] = useState('');
  const [articleUrl, setArticleUrl] = useState('');
  const [processedContent, setProcessedContent] = useState<ProcessedWord[]>([]);
  const [guessedWords, setGuessedWords] = useState<Map<string, GuessedWord>>(new Map());
  const [guessCount, setGuessCount] = useState(0);
  const [titleWords, setTitleWords] = useState(new Set<string>());
  const [guessHistory, setGuessHistory] = useState<string[]>([]);
  const [relatedWordsMap, setRelatedWordsMap] = useState(new Map<string, string>());
  const [categoryMap, setCategoryMap] = useState(new Map<string, Set<string>>());
  const [loadingMessage, setLoadingMessage] = useState('');
  // removed totalUniqueWords state (was unused)
  const [hiddenUniqueWords, setHiddenUniqueWords] = useState<string[]>([]);
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
  setHiddenUniqueWords(hiddenWordsArray);
        const hiddenWordsSet = new Set(hiddenWordsArray);

        // Normalize static related words DB against normalized hidden words
        const newRelatedWordsMap = new Map<string, string>();
        for (const clue in RELATED_WORDS_DB) {
            const target = RELATED_WORDS_DB[clue];
            const normClue = normalizeWord(clue);
            const normTarget = normalizeWord(target);
            if (hiddenWordsSet.has(normTarget)) {
                newRelatedWordsMap.set(normClue, normTarget);
            }
        }
        setRelatedWordsMap(newRelatedWordsMap);

        // Normalize semantic categories: both key and set items
        const newCategoryMap = new Map<string, Set<string>>();
        for (const rawCategory of SEMANTIC_CATEGORIES) {
          const normalizedCategory = new Set<string>();
          for (const w of rawCategory) {
            const nw = normalizeWord(w);
            if (nw) normalizedCategory.add(nw);
          }
          for (const nw of normalizedCategory) {
            newCategoryMap.set(nw, normalizedCategory);
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
      // Fix: Improved error handling for better type safety.
      if (error instanceof Error) {
        console.error('Error starting new game:', error.message);
      } else {
        // Fix: Explicitly convert unknown error to string to fix type error.
        const errorMessage = String(error);
        console.error('Error starting new game:', errorMessage);
      }
      setGameState('ERROR');
    }
  }, []);

  useEffect(() => {
    startNewGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // foundWordsCount was unused; removed to tidy code

  // Fix: Added type for the 'guess' parameter.
  const handleGuess = (guess: string) => {
    const trimmedGuess = guess.trim();
    if (!trimmedGuess || gameState !== 'PLAYING') return;

    setGuessHistory((prev) => [trimmedGuess, ...prev]);

    const normalizedGuess = normalizeWord(trimmedGuess);
    
    const existingGuess = guessedWords.get(normalizedGuess);
    if (existingGuess?.found) {
        return;
    }

    setGuessCount((prev) => prev + 1);

    let currentContent = [...processedContent];
    let wordFound = false;

    // Build reveal set with morphological variants
    const wordsToRevealDirectly = generateMorphoVariants(normalizedGuess);

    const conjugations = verbConjugations.get(normalizedGuess);
    if (conjugations) {
      conjugations.forEach((conj: string) => wordsToRevealDirectly.add(normalizeWord(conj)));
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

    // Fix: Explicitly type newGuessedWords to resolve property access errors on 'count' and 'found'.
    const newGuessedWords = new Map<string, GuessedWord>(guessedWords);

    if (wordFound) {
        currentContent = tempContent;
        const existing = newGuessedWords.get(normalizedGuess);
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
      // Show a hint chip for the closest number without revealing the original number
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
              // Render as a yellow hint chip using displayAs; do not show the original token
              return { ...word, hidden: false, isCloseGuess: true, displayAs: trimmedGuess };
            }
          }
          return word;
        });
      }

            if (foundStaticRelation) {
                wasCloseGuess = true;
            }

      // Typo proximity: only for guesses with length >= 3 to avoid noisy matches (e.g., 'e' -> 'en')
      if (!wordFound && !foundStaticRelation && !isNumericGuess && normalizedGuess.length >= 3) {
        let bestTarget: string | null = null;
        let bestDistance = Infinity;
        for (const target of hiddenUniqueWords) {
          if (target.length < 3) continue; // ignore very short hidden words
          // quick length filter
          const dl = Math.abs(target.length - normalizedGuess.length);
          if (dl > 2) continue;
          const d = levenshtein(normalizeWord(target), normalizedGuess);
          if (d < bestDistance) {
            bestDistance = d;
            bestTarget = target;
            if (d === 0) break;
          }
        }
        const threshold = normalizedGuess.length <= 4 ? 1 : 2;
        if (bestTarget && bestDistance > 0 && bestDistance <= threshold) {
          // Show a single hint chip for the closest target occurrence
          let shown = false;
          currentContent = currentContent.map((word) => {
            if (shown) return word;
            if (word.hidden) {
              const n = normalizeWord(word.original);
              if (n === bestTarget) {
                shown = true;
                return { ...word, hidden: false, isCloseGuess: true, displayAs: trimmedGuess };
              }
            }
            return word;
          });
          if (shown) wasCloseGuess = true;
        }
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
    const data = newGuessedWords.get(String(titleWord));
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
          <div className="bg-white/90 rounded-xl p-8 shadow-lg flex flex-col items-center gap-6 max-w-3xl w-full">
            <h2 className="text-2xl font-bold text-brand-primary">Recherche d'une page Wikipédia...</h2>
            <LoadingSpinner message={loadingMessage || "Chargement en cours..."} />
            <PopBubbles />
          </div>
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

export default App;