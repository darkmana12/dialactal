const wikipediaService = () => {
  const API_BASE_URL = 'https://fr.wikipedia.org/api/rest_v1';
  const WIKI_ACTION_API_URL = 'https://fr.wikipedia.org/w/api.php';
  const PAGEVIEWS_API_BASE_URL = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article';

  const POPULARITY_THRESHOLD = 5000;

  // Fix: Added type for title parameter.
  async function fetchAndParseArticleContent(title: string) {
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
    const nodesSource = contentWrapper || doc.body;

    let introParagraphs: HTMLElement[] = [];
    
    for (const node of Array.from(nodesSource.childNodes)) {
      if (node.nodeName === 'H2') {
        break;
      }
      
      if (node.nodeName === 'P' && node.textContent?.trim()) {
        introParagraphs.push(node as HTMLElement);
      }
    }

    if (introParagraphs.length === 0) {
      console.log("No intro paragraphs found before first H2, falling back to first 3 paragraphs of article.");
      introParagraphs = Array.from(doc.querySelectorAll('p')).filter(p => p.textContent?.trim()).slice(0, 3);
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

  // Fix: Added type for title parameter.
  async function isArticlePopular(title: string) {
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

  // Fix: Added return type annotation.
  async function fetchRandomArticle(): Promise<WikipediaArticle> {
    let attempt = 1;
    while (true) {
      console.log(`Attempt ${attempt} to find a popular article.`);
      try {
        const randomListUrl = `${WIKI_ACTION_API_URL}?action=query&list=random&rnnamespace=0&rnlimit=10&format=json&origin=*`;
        const randomListResponse = await fetch(randomListUrl);
        if (!randomListResponse.ok) {
          console.warn(`Failed to fetch a list of random articles on attempt ${attempt}. Retrying...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        const randomListData = await randomListResponse.json();
        const randomTitles = randomListData.query.random.map((item: any) => item.title);

        for (const title of randomTitles) {
          if (title.startsWith("Liste de") || title.includes("(homonymie)")) {
            console.log(`Skipping non-standard article from batch: "${title}".`);
            continue;
          }

          const isPopular = await isArticlePopular(title);
          if (!isPopular) {
            console.log(`Skipping unpopular article from batch: "${title}".`);
            continue;
          }

          const content = await fetchAndParseArticleContent(title);
          if (!content.trim()) {
            console.log(`Article from batch "${title}" has no content.`);
            continue;
          }

          console.log(`Selected popular article: "${title}"`);
          const url = `https://fr.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
          
          return {
            title,
            content,
            url,
          };
        }
        console.log(`No suitable article found in batch for attempt ${attempt}. Fetching a new batch.`);
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error during article fetching attempt ${attempt}:`, error.message);
        } else {
          console.error(`Error during article fetching attempt ${attempt}:`, String(error));
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      attempt++;
    }
  }

  window.WikiCherche.fetchRandomArticle = fetchRandomArticle;
};
wikipediaService();