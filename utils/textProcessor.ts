import type { ProcessedWord } from '../types';

import { COMMON_WORDS } from '../constants';

export function normalizeWord(word: string): string {
  if (!word) return '';
  return word.toLowerCase().replace(/[^a-z0-9à-ÿ-]/g, '');
}

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
    };
  });
}