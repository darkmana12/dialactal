import type { WikipediaArticle } from '../types';


// API constants (scope global module)
export const API_BASE_URL = 'https://fr.wikipedia.org/api/rest_v1';
export const WIKI_ACTION_API_URL = 'https://fr.wikipedia.org/w/api.php';
export const PAGEVIEWS_API_BASE_URL = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article';
export const POPULARITY_THRESHOLD = 5000;
const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';

// Helper: fetch all members (namespace 0) for a given category title
async function fetchCategoryMembers(categoryTitle: string, maxPages = 1000): Promise<string[]> {
  const titles: string[] = [];
  let cmcontinue: string | undefined = undefined;
  while (titles.length < maxPages) {
    const params = new URLSearchParams({
      action: 'query',
      list: 'categorymembers',
      cmtitle: categoryTitle,
      cmnamespace: '0',
      cmlimit: 'max',
      format: 'json',
      origin: '*',
    });
    if (cmcontinue) params.set('cmcontinue', cmcontinue);
    const url = `${WIKI_ACTION_API_URL}?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    const members = (data?.query?.categorymembers || []) as Array<{ title: string }>;
    for (const m of members) {
      if (m?.title) titles.push(m.title);
      if (titles.length >= maxPages) break;
    }
    if (data?.continue?.cmcontinue) {
      cmcontinue = data.continue.cmcontinue as string;
    } else {
      break;
    }
  }
  return titles;
}

// Helper: shuffle array in-place
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const TITLE_BLACKLIST_PATTERNS = [/\(homonymie\)/i, /^liste de /i];

// Additional difficulty filters: avoid overly specific or technical titles
function hasParentheses(title: string): boolean {
  return /\(/.test(title) && /\)/.test(title);
}

function hasColon(title: string): boolean {
  return title.includes(':');
}

function hasSlash(title: string): boolean {
  return title.includes('/');
}

function hasComma(title: string): boolean {
  return title.includes(',');
}

function looksLikeYearOrDate(title: string): boolean {
  const t = title.trim();
  // Standalone year or short numeric (e.g., "1998", "2020")
  if (/^\d{3,4}$/.test(t)) return true;
  // Contains a typical year token (1900–2099) or date-like pattern
  if (/(19\d{2}|20\d{2})/.test(t)) return true;
  // Common season/episode markers
  if (/\b(saison|épisode|episode|chapitre|tome|volume)\b/i.test(t)) return true;
  return false;
}

function isTooLong(title: string, maxLen = 45): boolean {
  return title.length > maxLen;
}

// Common countries/continents to detect regional-specific titles like "X au Togo"
const COUNTRIES_AND_CONTINENTS = [
  // Continents
  'afrique', 'amérique', 'asie', 'europe', 'océanie', 'antarctique',
  // Europe (subset)
  'france', 'espagne', 'italie', 'allemagne', 'royaume-uni', 'angleterre', 'irlande', 'portugal', 'belgique', 'pays-bas', 'suisse', 'autriche', 'suède', 'norvège', 'danemark', 'finlande', 'pologne', 'tchéquie', 'grèce', 'turquie', 'russie', 'ukraine',
  // Amériques (subset)
  'états-unis', 'etats-unis', 'canada', 'mexique', 'brésil', 'bresil', 'argentine', 'chili', 'pérou', 'perou', 'colombie', 'venezuela',
  // Afrique (subset)
  'maroc', 'algérie', 'algerie', 'tunisie', 'égypte', 'egypte', 'afrique du sud', 'nigeria', 'kenya', 'éthiopie', 'ethiopie', 'ghana', 'sénégal', 'senegal', 'togo', 'côte d’ivoire', "côte d'ivoire", 'cote d’ivoire', "cote d'ivoire",
  // Asie/Océanie (subset)
  'inde', 'chine', 'japon', 'corée du sud', 'coree du sud', 'australie', 'nouvelle-zélande', 'nouvelle-zelande', 'indonésie', 'indonesie', 'thaïlande', 'thailande', 'vietnam', 'cambodge', 'laos', 'philippines', 'arabie saoudite', 'israël', 'israel', 'iran', 'irak', 'syrie', 'liban', 'qatar', 'émirats arabes unis', 'emirats arabes unis'
];

function containsPrepositionCountryPattern(titleLower: string): boolean {
  const preps = [' au ', ' aux ', ' en ', ' à ', ' a ', ' a\u0300 ']; // handle potential composed accents fallback
  for (const name of COUNTRIES_AND_CONTINENTS) {
    const n = ` ${name.toLowerCase()} `;
    for (const p of preps) {
      if (titleLower.includes(p + name.toLowerCase())) return true;
    }
  }
  return false;
}

function isTitleAllowed(title: string): boolean {
  const t = title.toLowerCase();
  if (TITLE_BLACKLIST_PATTERNS.some((re) => re.test(t))) return false;
  // Exclude hyper-specific regional topics like "X au/en/à <pays/continent>"
  if (containsPrepositionCountryPattern(` ${t} `)) return false;
  // Exclude titles with qualifiers or subtopics that are often niche
  if (hasParentheses(title)) return false;
  if (hasColon(title)) return false;
  if (hasSlash(title)) return false;
  if (hasComma(title)) return false;
  if (looksLikeYearOrDate(title)) return false;
  if (isTooLong(title)) return false;
  return true;
}

// Curated pool: French Wikipedia quality articles (AdQ/BA)
async function fetchCuratedCandidateTitles(): Promise<string[]> {
  try {
    const categories = [
      'Catégorie:Article de qualité',
      'Catégorie:Bon article',
    ];
    const results = await Promise.all(categories.map((c) => fetchCategoryMembers(c, 2000)));
    const combined = Array.from(new Set(results.flat()));
    return shuffle(combined);
  } catch (e) {
    console.warn('Failed to fetch curated candidates:', e);
    return [];
  }
}

// Wikidata helpers: resolve specific entries to a broader parent topic
async function fetchWikidataIdForTitle(title: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'pageprops',
    titles: title,
    format: 'json',
    origin: '*',
  });
  const url = `${WIKI_ACTION_API_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages || {};
  for (const k of Object.keys(pages)) {
    const q = pages[k]?.pageprops?.wikibase_item;
    if (typeof q === 'string') return q;
  }
  return null;
}

async function fetchParentWikidataId(qid: string): Promise<string | null> {
  // Check P179 (part of series) then P361 (part of)
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: qid,
    props: 'claims',
    format: 'json',
    origin: '*',
  });
  const url = `${WIKIDATA_API_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const ent = data?.entities?.[qid]?.claims;
  if (!ent) return null;
  const pickParent = (prop: string): string | null => {
    const arr = ent[prop] as any[] | undefined;
    if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
    const snak = arr[0]?.mainsnak;
    const id = snak?.datavalue?.value?.id;
    return typeof id === 'string' ? id : null;
  };
  return pickParent('P179') || pickParent('P361') || null;
}

async function fetchFrWikiTitleForWikidataId(qid: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: qid,
    props: 'sitelinks',
    format: 'json',
    origin: '*',
  });
  const url = `${WIKIDATA_API_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const sitelinks = data?.entities?.[qid]?.sitelinks;
  const fr = sitelinks?.frwiki?.title;
  return typeof fr === 'string' ? fr : null;
}

async function resolveToMainTopic(title: string): Promise<string | null> {
  try {
    const qid = await fetchWikidataIdForTitle(title);
    if (!qid) return null;
    const parentQ = await fetchParentWikidataId(qid);
    if (!parentQ) return null;
    const frTitle = await fetchFrWikiTitleForWikidataId(parentQ);
    return frTitle || null;
  } catch {
    return null;
  }
}

// Notoriety check: keep topics with sufficient interlanguage presence (sitelinks)
async function isNotableBySitelinks(title: string, minLinks = 15): Promise<boolean> {
  try {
    const qid = await fetchWikidataIdForTitle(title);
    if (!qid) return false;
    const params = new URLSearchParams({
      action: 'wbgetentities',
      ids: qid,
      props: 'sitelinks',
      format: 'json',
      origin: '*',
    });
    const url = `${WIKIDATA_API_URL}?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) return false;
    const data = await res.json();
    const sitelinks = data?.entities?.[qid]?.sitelinks || {};
    const count = Object.keys(sitelinks).length;
    return count >= minLinks;
  } catch {
    return false;
  }
}

// Parse and extract the intro content from a Wikipedia article HTML
export async function fetchAndParseArticleContent(title: string): Promise<string> {
  const encodedTitle = encodeURIComponent(title);
  const response = await fetch(`${API_BASE_URL}/page/html/${encodedTitle}?origin=*`);
  if (!response.ok) {
    throw new Error(`Failed to fetch article HTML for "${title}"`);
  }
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  doc.querySelectorAll('figure, .infobox, .navbox, .reflist, #toc, .thumb, .metadata, .mw-editsection, sup').forEach(el => el.remove());
  const contentWrapper = doc.querySelector('.mw-parser-output');
  const nodesSource: HTMLElement = (contentWrapper as HTMLElement) || doc.body;
  let introParagraphs: HTMLParagraphElement[] = [];
  if (nodesSource && nodesSource.childNodes) {
    for (const node of Array.from(nodesSource.childNodes)) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as HTMLElement).nodeName === 'H2'
      ) {
        break;
      }
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as HTMLElement).nodeName === 'P' &&
        (node as HTMLElement).textContent?.trim()
      ) {
        introParagraphs.push(node as HTMLParagraphElement);
      }
    }
  }
  if (introParagraphs.length === 0) {
    introParagraphs = Array.from(doc.querySelectorAll('p')).filter((p): p is HTMLParagraphElement => !!p.textContent?.trim());
  }
  const finalParagraphs = introParagraphs.slice(0, 3);
  let content = '';
  finalParagraphs.forEach(p => {
    const pContent = p.textContent?.trim().replace(/^\d+[\.\)]\s*/, '');
    if (pContent) {
      content += pContent + '\n\n';
    }
  });
  return content;
}



export async function isArticlePopular(title: string): Promise<boolean> {
  try {
    const encodedTitle = encodeURIComponent(title);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    const formatDate = (date: Date) => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };
    const url = `${PAGEVIEWS_API_BASE_URL}/fr.wikipedia/all-access/user/${encodedTitle}/daily/${formatDate(startDate)}/${formatDate(endDate)}?origin=*`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Could not fetch page views for "${title}". Assuming it's not popular.`);
      return false;
    }
    const data = await response.json();
    if (!data.items) {
      return false;
    }
    const totalViews = data.items.reduce((sum: number, item: any) => sum + item.views, 0);
    console.log(`Article "${title}" has ${totalViews} user views in the last 30 days.`);
    return totalViews >= POPULARITY_THRESHOLD;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error checking popularity for "${title}":`, error.message);
    } else {
      console.error(`Error checking popularity for "${title}":`, String(error));
    }
    return false;
  }
}


export async function fetchRandomArticle(): Promise<WikipediaArticle> {
  // 1) Try curated pool first (AdQ/BA)
  const curated = await fetchCuratedCandidateTitles();
  if (curated.length > 0) {
    const maxTries = Math.min(60, curated.length);
    for (let i = 0; i < maxTries; i++) {
      const title = curated[Math.floor(Math.random() * curated.length)];
      if (title.startsWith('Liste de') || title.includes('(homonymie)')) continue;
      if (!isTitleAllowed(title)) continue;
      // Notoriety by sitelinks (bypass very local/obscure)
      if (!(await isNotableBySitelinks(title))) continue;
      try {
        // Try resolving to a broader main topic via Wikidata
        const broader = await resolveToMainTopic(title);
        let effectiveTitle = broader || title;
        // Fallback: strip trailing parenthetical qualifier to broaden topic
        if (!isTitleAllowed(effectiveTitle) && /\([^)]*\)\s*$/.test(effectiveTitle)) {
          const base = effectiveTitle.replace(/\s*\([^)]*\)\s*$/, '').trim();
          if (base && isTitleAllowed(base) && (await isNotableBySitelinks(base))) {
            effectiveTitle = base;
          }
        }
        if (broader && !isTitleAllowed(effectiveTitle)) continue;
        if (broader && !(await isNotableBySitelinks(effectiveTitle))) continue;
        const content = await fetchAndParseArticleContent(effectiveTitle);
        if (!content.trim()) continue;
        const url = `https://fr.wikipedia.org/wiki/${encodeURIComponent(effectiveTitle.replace(/ /g, '_'))}`;
        return { title: effectiveTitle, content, url };
      } catch {
        // try another
      }
    }
  }

  // 2) Fallback: legacy random batch (without popularity filter)
  let attempt = 1;
  while (true) {
    try {
  const randomListUrl = `${WIKI_ACTION_API_URL}?action=query&list=random&rnnamespace=0&rnlimit=20&format=json&origin=*`;
      const randomListResponse = await fetch(randomListUrl);
      if (!randomListResponse.ok) {
        await new Promise(resolve => setTimeout(resolve, 400));
        attempt++;
        continue;
      }
      const randomListData = await randomListResponse.json();
      const randomTitles = randomListData?.query?.random?.map((item: any) => item.title) || [];
      for (const title of randomTitles) {
        if (title.startsWith('Liste de') || title.includes('(homonymie)')) continue;
        if (!isTitleAllowed(title)) continue;
        if (!(await isNotableBySitelinks(title))) continue;
        try {
          const broader = await resolveToMainTopic(title);
          let effectiveTitle = broader || title;
          if (!isTitleAllowed(effectiveTitle) && /\([^)]*\)\s*$/.test(effectiveTitle)) {
            const base = effectiveTitle.replace(/\s*\([^)]*\)\s*$/, '').trim();
            if (base && isTitleAllowed(base) && (await isNotableBySitelinks(base))) {
              effectiveTitle = base;
            }
          }
          if (broader && !isTitleAllowed(effectiveTitle)) continue;
          if (broader && !(await isNotableBySitelinks(effectiveTitle))) continue;
          const content = await fetchAndParseArticleContent(effectiveTitle);
          if (!content.trim()) continue;
          const url = `https://fr.wikipedia.org/wiki/${encodeURIComponent(effectiveTitle.replace(/ /g, '_'))}`;
          return { title: effectiveTitle, content, url };
        } catch {
          // skip
        }
      }
    } catch (error) {
      // brief backoff then retry
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    attempt++;
  }
}

