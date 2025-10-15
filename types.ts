// FIX: Export interfaces and types to be used across the application.
export interface ProcessedWord {
  original: string;
  hidden: boolean;
  isPunctuation: boolean;
  displayAs?: string;
  isCloseGuess?: boolean;
  closestGuessDistance?: number;
}

export type GameState = 'LOADING' | 'PLAYING' | 'WON' | 'REVEALED' | 'ERROR';

export interface GuessedWord {
  found: boolean;
  count: number;
  isTitle: boolean;
  isSynonym: boolean;
}

export interface WikipediaArticle {
  title: string;
  content: string;
  url: string;
}
