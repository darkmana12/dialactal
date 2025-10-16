import type { ProcessedWord } from '../types';

import { COMMON_WORDS } from '../constants';

export function normalizeWord(word: string): string {
  if (!word) return '';
  let w = word
    .normalize('NFKC')
    .replace(/[\u2019\u2018\u2032]/g, "'")
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss');
  const elision = w.match(/^(?:l|d|j|m|t|n|s|qu)'(.+)$/);
  if (elision) {
    w = elision[1];
  }
  w = w.normalize('NFD').replace(/\p{M}+/gu, '');
  w = w.replace(/[^\p{L}\p{N}-]+/gu, '');
  w = w.replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
  return w;
}

export function processArticleContent(content: string): ProcessedWord[] {
  const regex = /(\p{L}[\p{L}\p{M}\p{N}'-]*|\p{N}+[\p{L}\p{M}'-]*|[\p{L}\p{M}\p{N}]+)|(\s+|[.,;:?!()"\u2019\u201c\u201d\u2014\u2013\u2026\u00ab\u00bb])/gu;
  const parts = content.match(regex) || [];

  return parts.map(part => {
    const isPunctuationOrSpace = !/[\p{L}\p{N}]/u.test(part[0]);
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

export function generateMorphoVariants(base: string): Set<string> {
  const variants = new Set<string>([base]);
  if (base.length > 1) variants.add(base + 's');
  if (base.endsWith('s') && base.length > 1) variants.add(base.slice(0, -1));
  if (base.endsWith('eau')) variants.add(base + 'x');
  if (base.endsWith('eaux')) variants.add(base.slice(0, -1));
  if (base.endsWith('al')) variants.add(base.slice(0, -2) + 'aux');
  if (base.endsWith('aux') && base.length > 3) variants.add(base.slice(0, -3) + 'al');
  if ((base.endsWith('au') || base.endsWith('eu')) && base.length > 2) variants.add(base + 'x');
  if ((base.endsWith('aux') || base.endsWith('eux')) && base.length > 3) variants.add(base.slice(0, -1));
  const pairs: Array<[string, string]> = [
    ['euse', 'eur'],
    ['ive', 'if'],
    ['enne', 'en'],
    ['elle', 'el'],
    ['ette', 'et'],
    ['onne', 'on'],
    ['ere', 'er'],
    ['ete', 'et'],
  ];
  for (const [a, b] of pairs) {
    if (base.endsWith(a)) variants.add(base.slice(0, -a.length) + b);
    if (base.endsWith(b)) variants.add(base.slice(0, -b.length) + a);
  }
  return variants;
}

// Levenshtein edit distance (iterative DP, O(n*m), optimized space)
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;
  // Ensure a is the shorter for less memory
  if (n > m) {
    return levenshtein(b, a);
  }
  let prev = new Array(n + 1) as number[];
  let curr = new Array(n + 1) as number[];
  for (let i = 0; i <= n; i++) prev[i] = i;
  for (let j = 1; j <= m; j++) {
    const bj = b.charCodeAt(j - 1);
    curr[0] = j;
    for (let i = 1; i <= n; i++) {
      const cost = a.charCodeAt(i - 1) === bj ? 0 : 1;
      curr[i] = Math.min(
        prev[i] + 1,        // deletion
        curr[i - 1] + 1,    // insertion
        prev[i - 1] + cost  // substitution
      );
    }
    // swap arrays
    const tmp = prev; prev = curr; curr = tmp;
  }
  return prev[n];
}