import { db } from "@/db";
import { articles, topics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchGNewsTopHeadlines, type GNewsArticle } from "./gnews";
import { hashUrl } from "./hash";
import { tagArticle, getAllTopics } from "./tagger";

// ============================================
// Types
// ============================================

export interface FetchResult {
  fetched: number;
  inserted: number;
  duplicates: number;
  taggedByRule: number;
  taggedByAI: number;
  untagged: number;
  errors: string[];
}

// ============================================
// Seed Topics
// ============================================

/**
 * Ensure all topics exist in the database
 */
export async function seedTopics(): Promise<void> {
  const allTopics = getAllTopics();

  for (const topic of allTopics) {
    // Upsert each topic
    const existing = await db.query.topics.findFirst({
      where: eq(topics.slug, topic.slug),
    });

    if (!existing) {
      await db.insert(topics).values({
        name: topic.name,
        slug: topic.slug,
        sortOrder: topic.sortOrder,
      });
      console.log(`Created topic: ${topic.name}`);
    }
  }
}

// ============================================
// Fetch & Store
// ============================================

export interface FetchOptions {
  maxArticles?: number;
  useAI?: boolean;
}

/**
 * Fetch articles from GNews and store them in the database
 */
export async function fetchAndStoreArticles(
  options: FetchOptions = {}
): Promise<FetchResult> {
  const { maxArticles = 50, useAI = true } = options;

  const result: FetchResult = {
    fetched: 0,
    inserted: 0,
    duplicates: 0,
    taggedByRule: 0,
    taggedByAI: 0,
    untagged: 0,
    errors: [],
  };

  try {
    // Ensure topics exist
    await seedTopics();

    // Fetch from GNews (last 24 hours by default)
    const response = await fetchGNewsTopHeadlines({
      max: maxArticles,
    });

    result.fetched = response.articles.length;

    // Get topic slugs to IDs mapping
    const topicRecords = await db.query.topics.findMany();
    const topicMap = new Map(topicRecords.map((t) => [t.slug, t.id]));

    // Process each article
    for (const article of response.articles) {
      try {
        await processArticle(article, topicMap, result, useAI);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Failed to process "${article.title}": ${message}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Fetch failed: ${message}`);
  }

  return result;
}

/**
 * Process a single article
 */
async function processArticle(
  article: GNewsArticle,
  topicMap: Map<string, string>,
  result: FetchResult,
  useAI: boolean
): Promise<void> {
  const urlHash = hashUrl(article.url);

  // Check for duplicate
  const existing = await db.query.articles.findFirst({
    where: eq(articles.urlHash, urlHash),
  });

  if (existing) {
    result.duplicates++;
    return;
  }

  // Tag the article (async, may use AI)
  const tagResult = await tagArticle(article.title, article.description, {
    useAI,
  });

  const topicId = tagResult.topicSlug
    ? topicMap.get(tagResult.topicSlug) || null
    : null;

  // Track tagging stats
  if (tagResult.topicSlug) {
    if (tagResult.source === "ai") {
      result.taggedByAI++;
    } else {
      result.taggedByRule++;
    }
  } else {
    result.untagged++;
  }

  // Insert the article
  await db.insert(articles).values({
    topicId,
    sourceName: "gnews",
    title: article.title,
    description: article.description,
    content: article.content,
    author: null, // GNews doesn't provide author
    publisherName: article.source.name,
    url: article.url,
    urlHash,
    imageUrl: article.image,
    publishedAt: new Date(article.publishedAt),
  });

  result.inserted++;

  // Log tagging result
  console.log(
    `[Tagger] "${article.title.slice(0, 50)}..." → ${tagResult.topicSlug || "untagged"} (${tagResult.source}, ${(tagResult.confidence * 100).toFixed(0)}%)`
  );
}

/**
 * Get fetch statistics
 */
export async function getFetchStats() {
  const articleCount = await db.query.articles.findMany();
  const topicCounts = await db.query.topics.findMany({
    with: {
      articles: true,
    },
  });

  return {
    totalArticles: articleCount.length,
    byTopic: topicCounts.map((t) => ({
      topic: t.name,
      slug: t.slug,
      count: t.articles?.length || 0,
    })),
  };
}
