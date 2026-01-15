/**
 * GNews API Client
 * Docs: https://gnews.io/docs/v4
 */

// ============================================
// Types
// ============================================

export interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string; // ISO 8601
  source: {
    name: string;
    url: string;
  };
}

export interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

export interface GNewsFetchOptions {
  query?: string;
  lang?: string;
  country?: string;
  max?: number; // 1-100, default 10
  from?: Date; // Filter articles from this date (ISO 8601)
  to?: Date; // Filter articles to this date (ISO 8601)
}

// ============================================
// Client
// ============================================

const GNEWS_BASE_URL = "https://gnews.io/api/v4";

// Default: fetch articles from last 24 hours
const DEFAULT_HOURS_AGO = 24;

/**
 * Fetch tech news from GNews search endpoint with date filtering
 * Uses search endpoint to enable from/to date filters
 */
export async function fetchGNewsTopHeadlines(
  options: GNewsFetchOptions = {}
): Promise<GNewsResponse> {
  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    throw new Error("GNEWS_API_KEY environment variable is not set");
  }

  const {
    query = "technology OR tech OR software OR AI OR startup",
    lang = "en",
    country = "us",
    max = 10,
    from = new Date(Date.now() - DEFAULT_HOURS_AGO * 60 * 60 * 1000), // Default: 24 hours ago
    to,
  } = options;

  const params = new URLSearchParams({
    apikey: apiKey,
    q: query,
    lang,
    country,
    max: max.toString(),
    from: from.toISOString(),
  });

  if (to) {
    params.set("to", to.toISOString());
  }

  const url = `${GNEWS_BASE_URL}/search?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GNews API error (${response.status}): ${error}`);
  }

  const data: GNewsResponse = await response.json();
  return data;
}

/**
 * Search GNews with custom query and date range
 */
export async function fetchGNewsSearch(
  query: string,
  options: Omit<GNewsFetchOptions, "query"> = {}
): Promise<GNewsResponse> {
  return fetchGNewsTopHeadlines({ ...options, query });
}
