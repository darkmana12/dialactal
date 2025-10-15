const textProcessor = () => {
  const { COMMON_WORDS } = window.WikiCherche;

  // Fix: Added type annotations for parameter and return value.
  function normalizeWord(word: string): string {
    if (!word) return '';
    return word.toLowerCase().replace(/[^a-z0-9à-ÿ-]/g, '');
  }

  // Fix: Added type annotations for parameter and return value.
  function processArticleContent(content: string): ProcessedWord[] {
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

  window.WikiCherche.normalizeWord = normalizeWord;
  window.WikiCherche.processArticleContent = processArticleContent;
};
textProcessor();