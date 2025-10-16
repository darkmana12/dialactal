
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchRandomArticle } from './services/wikipediaService';
import { processArticleContent, normalizeWord, generateMorphoVariants, levenshtein } from './utils/textProcessor';
import { verbConjugations } from './utils/verbConjugations';
import { RELATED_WORDS_DB, SEMANTIC_CATEGORIES, NO_MORPH_REVEAL_WORDS } from './constants';
import GameBoard from './components/GameBoard';
import GuessInput from './components/GuessInput';
import GuessedWordsList from './components/GuessedWordsList';
import GameInfoPanel from './components/GameInfoPanel';
import LoadingSpinner from './components/LoadingSpinner';
import PopBubbles from './components/minigames/PopBubbles';
import WinModal from './components/WinModal';
import type { GameState, ProcessedWord, GuessedWord } from './types';
import CoopPanel from './components/CoopPanel';
import { WebSocketSyncService, type CoopEvent } from './services/wsSyncService';

// Guard to prevent startNewGame from running twice in development due to React StrictMode remounts
let didInit = false;

const App = () => {

  const [gameState, setGameState] = useState<GameState>('LOADING');
  const [articleTitle, setArticleTitle] = useState('');
  const [articleUrl, setArticleUrl] = useState('');
  const [rawArticleContent, setRawArticleContent] = useState('');
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

  // Coop state
  // Default WebSocket URL (local dev server); can be made configurable
  const [sync] = useState(() => new WebSocketSyncService('ws://127.0.0.1:8787'));
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [seenPeers, setSeenPeers] = useState<Set<string>>(new Set());
  const [isHost, setIsHost] = useState(false);
  // Refs to avoid rejoining on every state change while having fresh values in handlers
  const isHostRef = useRef(isHost);
  const articleTitleRef = useRef(articleTitle);
  const articleUrlRef = useRef(articleUrl);
  const rawArticleContentRef = useRef(rawArticleContent);

  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { articleTitleRef.current = articleTitle; }, [articleTitle]);
  useEffect(() => { articleUrlRef.current = articleUrl; }, [articleUrl]);
  useEffect(() => { rawArticleContentRef.current = rawArticleContent; }, [rawArticleContent]);
  // Ref to always invoke the latest handleGuess from WS events (avoid stale closures)
  const handleGuessRef = useRef<(g: string, remote?: boolean) => void>(() => {});
  
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
        setRawArticleContent(article.content);
        const normalizedTitleWords = new Set(
          article.title
            .split(' ')
            .map(normalizeWord)
            .filter(w => w.length > 0)
        );
        setTitleWords(normalizedTitleWords);

        setLoadingMessage("Analyse sémantique des mots...");
        const processed = processArticleContent(article.content);

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

        // Broadcast new game to room if host
        if (roomId && isHost) {
          sync.send({ type: 'new-game', from: sync.getPeerId() });
          sync.send({ type: 'load-article', from: sync.getPeerId(), payload: { title: article.title, url: article.url, content: article.content } });
        }
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
  }, [roomId, isHost, sync]);

  useEffect(() => {
    if (!didInit) {
      didInit = true;
      // If URL contains a room code, join and wait for host instead of starting a local game
      const hash = window.location.hash;
      const m = hash.match(/#room=([A-Z0-9]+)/i);
      if (m && m[1]) {
        setGameState('LOADING');
        setLoadingMessage('Connexion à la salle...');
        joinRoom(m[1].toUpperCase());
      } else {
        startNewGame();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // foundWordsCount was unused; removed to tidy code

  // Fix: Added type for the 'guess' parameter.
  const handleGuess = (guess: string, remote: boolean = false) => {
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
    // Prevent revealing certain function words (e.g., 'ne') via morphological/normalized matches unless exact typed
    const blockedByMorphRule = NO_MORPH_REVEAL_WORDS.has(normalizedOriginal) && word.original !== trimmedGuess;
    if (isRevealable && !blockedByMorphRule && wordsToRevealDirectly.has(normalizedOriginal)) {
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

    // Coop: broadcast guess unless it originated remotely
    if (roomId && !remote) {
      sync.send({ type: 'guess', from: sync.getPeerId(), payload: { guess: trimmedGuess } });
    }


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
  // Keep ref pointing to latest handleGuess implementation
  useEffect(() => { handleGuessRef.current = handleGuess; });

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

    if (roomId) {
      sync.send({ type: 'reveal', from: sync.getPeerId() });
    }
  }, [gameState, processedContent]);
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Coop: message handling
  useEffect(() => {
    if (!roomId) return;
    const onMessage = (evt: CoopEvent) => {
      switch (evt.type) {
        case 'joined': {
          // Successfully joined room; announce presence then request sync from host
          setLoadingMessage('Connecté. En attente de synchronisation de la partie...');
          sync.send({ type: 'hello', from: sync.getPeerId() });
          sync.send({ type: 'sync-request', from: sync.getPeerId() });
          break;
        }
        case 'hello': {
          setPlayers((p) => Array.from(new Set([...p, evt.from])));
          setSeenPeers((prev) => {
            const next = new Set(prev);
            if (!next.has(evt.from)) {
              next.add(evt.from);
              // reply with my presence once per peer
              sync.send({ type: 'hello', from: sync.getPeerId() });
            }
            return next;
          });
          // If I'm host, share current article state (use raw content for proper parsing)
          if (isHost && articleTitle && articleUrl && rawArticleContent) {
            sync.send({ type: 'load-article', from: sync.getPeerId(), payload: { title: articleTitle, url: articleUrl, content: rawArticleContent } });
          }
          break;
        }
        case 'goodbye': {
          setPlayers((p) => p.filter((id) => id !== evt.from));
          break;
        }
        case 'peer-joined': {
          // Increment peer count optimistically when server announces a join
          setPlayers((p) => Array.from(new Set([...p, 'peer'])));
          break;
        }
        case 'peer-left': {
          // Decrement if possible
          setPlayers((p) => (p.length > 1 ? p.slice(0, p.length - 1) : p));
          break;
        }
        case 'sync-request': {
          if (isHost && articleTitle && articleUrl && rawArticleContent) {
            sync.send({ type: 'load-article', from: sync.getPeerId(), payload: { title: articleTitle, url: articleUrl, content: rawArticleContent } });
          }
          break;
        }
        case 'guess': {
          const g = evt.payload?.guess as string | undefined;
          if (g) handleGuessRef.current?.(g, true);
          break;
        }
        case 'reveal': {
          if (gameState === 'PLAYING') {
            const revealedContent = processedContent.map(word => ({ ...word, hidden: false, isCloseGuess: false }));
            setProcessedContent(revealedContent);
            setGameState('REVEALED');
            setIsModalOpen(true);
          }
          break;
        }
        case 'new-game': {
          // Ignore here; host will send load-article.
          break;
        }
        case 'load-article': {
          const payload = evt.payload as { title: string; url: string; content: string } | undefined;
          if (payload) {
            setGameState('LOADING');
            setIsModalOpen(true);
            setLoadingMessage("Synchronisation de la partie...");
            setGuessedWords(new Map());
            setGuessCount(0);
            setTitleWords(new Set());
            setGuessHistory([]);
            setRelatedWordsMap(new Map());
            setCategoryMap(new Map());

            setArticleTitle(payload.title);
            setArticleUrl(payload.url);
            setRawArticleContent(payload.content);
            const normalizedTitleWords = new Set(
              payload.title.split(' ').map(normalizeWord).filter(w => w.length > 0)
            );
            setTitleWords(normalizedTitleWords);
            const processed = processArticleContent(payload.content);
            const hiddenWordsArray = Array.from(new Set(
              processed.filter(w => w.hidden && !w.isPunctuation).map(w => normalizeWord(w.original))
            ));
            setHiddenUniqueWords(hiddenWordsArray);
            setProcessedContent(processed);
            setGameState('PLAYING');
          }
          break;
        }
      }
    };
    sync.join(roomId, onMessage);
  // Register myself; do not send hello until 'joined' to ensure room is set server-side
  setPlayers([sync.getPeerId()]);
  setSeenPeers(new Set([sync.getPeerId()]));
  // Wait for 'joined' event before sending hello/sync-request
    // Safety: if no sync in 5s, keep user informed
    const to = setTimeout(() => {
      setLoadingMessage("Toujours en attente de l'hôte... Assure-toi que l'hôte a bien ouvert la salle.");
    }, 5000);
    return () => {
      // announce leaving
      sync.send({ type: 'goodbye', from: sync.getPeerId() });
      sync.leave();
      setPlayers([]);
      clearTimeout(to);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Removed duplicate auto-join effect; handled in initial mount logic above

  const createRoom = (rid: string) => {
    setIsHost(true);
    setRoomId(rid);
  };
  const joinRoom = (rid: string) => {
    setIsHost(false);
    setRoomId(rid);
  };
  const leaveRoom = () => {
    setRoomId(null);
    setIsHost(false);
    sync.send({ type: 'goodbye', from: sync.getPeerId() });
    sync.leave();
    setPlayers([]);
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
            <CoopPanel
              connected={!!roomId}
              isHost={isHost}
              roomId={roomId}
              players={players}
              onCreate={createRoom}
              onJoin={joinRoom}
              onLeave={leaveRoom}
              onHostNewGame={startNewGame}
            />
            <GuessedWordsList guessHistory={guessHistory} />
          </aside>

          <main className="lg:col-span-3 flex flex-col gap-6">
            <GuessInput 
              onGuess={(g) => handleGuess(String(g))}
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