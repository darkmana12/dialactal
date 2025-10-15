// FIX: Import types using ES modules.
import type { WikipediaArticle } from '../types';

const API_BASE_URL = 'https://fr.wikipedia.org/api/rest_v1';
const WIKI_ACTION_API_URL = 'https://fr.wikipedia.org/w/api.php';
const PAGEVIEWS_API_BASE_URL = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article';

// We want articles that are reasonably well-known.
// We'll check the page views for the last 30 days and set a threshold.
// This filters out very obscure topics. Lowered to 5000 for fr.wikipedia to improve reliability.
const POPULARITY_THRESHOLD = 5000;

// Fetches the HTML content of a Wikipedia page and extracts the introductory text.
// The introduction is considered to be the paragraphs before the first main section
// heading (H2), capped at a maximum of 3 paragraphs to ensure conciseness.
async function fetchAndParseArticleContent(title: string): Promise<string> {
  const encodedTitle = encodeURIComponent(title);
  const response = await fetch(`${API_BASE_URL}/page/html/${encodedTitle}?origin=*`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch article HTML for "${title}"`);
  }
  
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Remove elements that are not part of the main content, including superscript tags which often contain citations.
  doc.querySelectorAll('figure, .infobox, .navbox, .reflist, #toc, .thumb, .metadata, .mw-editsection, sup').forEach(el => el.remove());

  const contentWrapper = doc.querySelector('.mw-parser-output');
  // Use the main content wrapper if available, otherwise fallback to the body
  const nodesSource = contentWrapper || doc.body;

  let introParagraphs: HTMLElement[] = [];
  
  // Iterate through child nodes to find paragraphs before the first section heading (H2)
  for (const node of Array.from(nodesSource.childNodes)) {
    if (node.nodeName === 'H2') {
      break; // Stop at the first section heading
    }
    
    if (node.nodeName === 'P' && node.textContent?.trim()) {
      introParagraphs.push(node as HTMLElement);
    }
  }

  // If the above method failed to find paragraphs (e.g., unusual article structure),
  // fall back to a simpler method: just take the first few paragraphs from the document.
  if (introParagraphs.length === 0) {
    console.log("No intro paragraphs found before first H2, falling back to first 3 paragraphs of article.");
    introParagraphs = Array.from(doc.querySelectorAll('p')).filter(p => p.textContent?.trim()).slice(0, 3);
  }

  // Limit to the first 3 paragraphs to keep it concise, as requested.
  const finalParagraphs = introParagraphs.slice(0, 3);

  let content = '';
  finalParagraphs.forEach(p => {
    // After removing sup tags, we also clean up numbered list formatting from the start of paragraphs.
    const pContent = p.textContent?.trim().replace(/^\d+[\.\)]\s*/, '');
    if (pContent) {
      content += pContent + '\n\n';
    }
  });
  
  return content;
}

/**
 * Checks if a Wikipedia article is popular enough based on recent page views.
 * @param title The title of the article.
 * @returns A promise that resolves to true if the article is popular, false otherwise.
 */
async function isArticlePopular(title: string): Promise<boolean> {
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

    // We check for 'user' views to filter out bots and get a better sense of human interest.
    const url = `${PAGEVIEWS_API_BASE_URL}/fr.wikipedia/all-access/user/${encodedTitle}/daily/${formatDate(startDate)}/${formatDate(endDate)}?origin=*`;

    const response = await fetch(url);
    if (!response.ok) {
        console.warn(`Could not fetch page views for "${title}". Assuming it's not popular.`);
        return false;
    }
    
    const data = await response.json();
    if (!data.items) {
      return false; // No data returned
    }

    const totalViews = data.items.reduce((sum: number, item: { views: number }) => sum + item.views, 0);
    
    console.log(`Article "${title}" has ${totalViews} user views in the last 30 days.`);
    return totalViews >= POPULARITY_THRESHOLD;
  } catch (error) {
    // Fix: The 'error' object in a catch block is of type 'unknown'. Handle it safely.
    if (error instanceof Error) {
        console.error(`Error checking popularity for "${title}":`, error.message);
    } else {
        console.error(`Error checking popularity for "${title}":`, String(error));
    }
    return false; // Fail safe
  }
}

// Fetches a random article by getting a batch of titles and picking the first suitable one. This will loop indefinitely until a suitable article is found.
// FIX: Export the function and add a return type.
export async function fetchRandomArticle(): Promise<WikipediaArticle> {
  let attempt = 1;
  while (true) {
    console.log(`Attempt ${attempt} to find a popular article.`);
    try {
      // 1. Fetch a list of random article titles
      const randomListUrl = `${WIKI_ACTION_API_URL}?action=query&list=random&rnnamespace=0&rnlimit=10&format=json&origin=*`;
      const randomListResponse = await fetch(randomListUrl);
      if (!randomListResponse.ok) {
        console.warn(`Failed to fetch a list of random articles on attempt ${attempt}. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      const randomListData = await randomListResponse.json();
      const randomTitles = randomListData.query.random.map((item: { title: string }) => item.title);

      // 2. Iterate through the list and find the first suitable article
      for (const title of randomTitles) {
        // Filter out list articles or other non-standard pages
        if (title.startsWith("Liste de") || title.includes("(homonymie)")) {
          console.log(`Skipping non-standard article from batch: "${title}".`);
          continue;
        }

        // Check if the article is popular enough
        const isPopular = await isArticlePopular(title);
        if (!isPopular) {
          console.log(`Skipping unpopular article from batch: "${title}".`);
          continue;
        }

        // Fetch content and ensure it's not empty
        const content = await fetchAndParseArticleContent(title);
        if (!content.trim()) {
          console.log(`Article from batch "${title}" has no content.`);
          continue;
        }

        // Success! We found a good article.
        console.log(`Selected popular article: "${title}"`);
        const url = `https://fr.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
        
        return {
          title,
          content,
          url,
        };
      }
      // If no article in the batch was suitable, the loop will continue to the next attempt.
      console.log(`No suitable article found in batch for attempt ${attempt}. Fetching a new batch.`);
    } catch (error) {
      // Fix: The 'error' object in a catch block is of type 'unknown'. Handle it safely.
      if (error instanceof Error) {
        console.error(`Error during article fetching attempt ${attempt}:`, error.message);
      } else {
        console.error(`Error during article fetching attempt ${attempt}:`, String(error));
      }
      // Wait a bit before retrying in case of transient network errors
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    attempt++;
  }
}
