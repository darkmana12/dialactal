import type { ProcessedWord } from '../types';
import { COMMON_WORDS } from '../constants';

/**
 * Normalizes a word by converting to lowercase and removing non-alphanumeric characters.
 * @param word The word to normalize.
 * @returns The normalized word.
 */
export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9à-ÿ-]/g, '');
}

/**
 * Processes the raw text content of a Wikipedia article into a structure for the game board.
 * It splits text into words and punctuation, and determines which words should be initially hidden.
 * @param content The raw string content of the article.
 * @returns An array of ProcessedWord objects.
 */
export function processArticleContent(content: string): ProcessedWord[] {
  const regex = /([a-zA-Z0-9à-ÿ'-]+)|([.,;:?!()"’“”—–…«»\s]+)/g;
  const parts = content.match(regex) || [];

  return parts.map(part => {
    const isPunctuationOrSpace = !/[a-zA-Z0-9à-ÿ'-]/.test(part[0]);
    if (isPunctuationOrSpace) {
      return { original: part, hidden: false, isPunctuation: true };
    }
    
    const normalized = normalizeWord(part);
    const isCommon = COMMON_WORDS.has(normalized);
    
    return {
      original: part,
      hidden: !isCommon,
      isPunctuation: false,
      isCloseGuess: false,
    };
  });
}
