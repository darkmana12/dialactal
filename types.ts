// Fix: Added a global declaration for window.WikiCherche to resolve TypeScript errors.
declare global {
  interface Window {
    WikiCherche: any;
  }

  // Fix: Moved type definitions to global scope to be accessible across files without imports.
  interface ProcessedWord {
    original: string;
    hidden: boolean;
    isPunctuation: boolean;
    displayAs?: string;
    isCloseGuess?: boolean;
    closestGuessDistance?: number;
  }

  type GameState = 'LOADING' | 'PLAYING' | 'WON' | 'REVEALED' | 'ERROR';

  interface GuessedWord {
    found: boolean;
    count: number;
    isTitle: boolean;
    isSynonym: boolean;
  }

  interface WikipediaArticle {
    title: string;
    content: string;
    url: string;
  }
}

// Fix: Export an empty object to treat this file as a module, allowing global scope augmentation.
export {};