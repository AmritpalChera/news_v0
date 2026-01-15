import { db } from "@/db";
import { articles, topics, digests } from "@/db/schema";
import { eq, gte, and, desc, isNull } from "drizzle-orm";
import { generateDigest, type ArticleForDigest } from "./ai";

// ============================================
// Types
// ============================================

export interface GenerateDigestResult {
  digestId: string;
  title: string;
  articleCount: number;
  isNew: boolean;
}

export interface GenerateAllDigestsResult {
  global: GenerateDigestResult | null;
  byTopic: GenerateDigestResult[];
  errors: string[];
}

// ============================================
// Digest Generation
// ============================================

/**
 * Generate a daily digest for a specific date
 * Can be global (all topics) or topic-specific
 */
export async function generateDailyDigest(options: {
  date?: Date;
  topicId?: string | null;
  forceRegenerate?: boolean;
  maxArticles?: number; // Max articles to include in digest (default: all from last 24h, up to 70)
}): Promise<GenerateDigestResult | null> {
  const { date = new Date(), topicId = null, forceRegenerate = false, maxArticles = 70 } = options;

  // Normalize date to start of day
  const digestDate = new Date(date);
  digestDate.setHours(0, 0, 0, 0);

  // Check if digest already exists
  const existingDigest = await db.query.digests.findFirst({
    where: and(
      eq(digests.type, "daily"),
      topicId ? eq(digests.topicId, topicId) : isNull(digests.topicId),
      eq(digests.date, digestDate)
    ),
  });

  if (existingDigest && !forceRegenerate) {
    return {
      digestId: existingDigest.id,
      title: existingDigest.title || "Daily Digest",
      articleCount: 0,
      isNew: false,
    };
  }

  // Get articles from the last 24 hours
  const since = new Date(digestDate);
  since.setHours(since.getHours() - 24);

  const whereConditions = topicId
    ? and(eq(articles.topicId, topicId), gte(articles.publishedAt, since))
    : gte(articles.publishedAt, since);

  const recentArticles = await db.query.articles.findMany({
    where: whereConditions,
    orderBy: [desc(articles.publishedAt)],
    limit: maxArticles,
  });

  if (recentArticles.length === 0) {
    return null;
  }

  // Get topic name if topic-specific
  let topicName: string | undefined;
  if (topicId) {
    const topic = await db.query.topics.findFirst({
      where: eq(topics.id, topicId),
    });
    topicName = topic?.name;
  }

  // Prepare articles for digest
  const articlesForDigest: ArticleForDigest[] = recentArticles.map((a) => ({
    title: a.title,
    description: a.description || undefined,
    publisherName: a.publisherName || undefined,
    url: a.url,
  }));

  // Generate digest with AI
  const digestResult = await generateDigest(articlesForDigest, {
    topicName,
    date: digestDate,
  });

  // Delete existing digest if regenerating
  if (existingDigest && forceRegenerate) {
    await db.delete(digests).where(eq(digests.id, existingDigest.id));
  }

  // Store the digest
  const [newDigest] = await db
    .insert(digests)
    .values({
      type: "daily",
      topicId,
      date: digestDate,
      title: digestResult.title,
      content: digestResult.content,
      imageUrl: digestResult.imageUrl,
      model: digestResult.model,
    })
    .returning();

  return {
    digestId: newDigest.id,
    title: newDigest.title || "Daily Digest",
    articleCount: recentArticles.length,
    isNew: true,
  };
}

/**
 * Generate daily digests for all topics + global
 */
export async function generateAllDailyDigests(options: {
  date?: Date;
  forceRegenerate?: boolean;
} = {}): Promise<GenerateAllDigestsResult> {
  const { date = new Date(), forceRegenerate = false } = options;

  const result: GenerateAllDigestsResult = {
    global: null,
    byTopic: [],
    errors: [],
  };

  // Generate global digest
  try {
    result.global = await generateDailyDigest({
      date,
      topicId: null,
      forceRegenerate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Global digest failed: ${message}`);
  }

  // Get all topics
  const allTopics = await db.query.topics.findMany();

  // Generate digest for each topic
  for (const topic of allTopics) {
    try {
      const topicDigest = await generateDailyDigest({
        date,
        topicId: topic.id,
        forceRegenerate,
      });

      if (topicDigest) {
        result.byTopic.push(topicDigest);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`${topic.name} digest failed: ${message}`);
    }
  }

  return result;
}

/**
 * Get the latest digest (global or topic-specific)
 * Orders by createdAt to get the most recent if multiple exist for same day
 */
export async function getLatestDigest(topicId?: string | null) {
  const whereConditions = topicId
    ? and(eq(digests.type, "daily"), eq(digests.topicId, topicId))
    : and(eq(digests.type, "daily"), isNull(digests.topicId));

  const digest = await db.query.digests.findFirst({
    where: whereConditions,
    orderBy: [desc(digests.createdAt)],
    with: {
      topic: true,
    },
  });

  return digest;
}

/**
 * Get digests for a date range
 */
export async function getDigests(options: {
  type?: "daily" | "weekly";
  topicId?: string | null;
  limit?: number;
}) {
  const { type = "daily", topicId, limit = 10 } = options;

  let whereConditions = eq(digests.type, type);

  if (topicId !== undefined) {
    whereConditions = and(
      whereConditions,
      topicId ? eq(digests.topicId, topicId) : isNull(digests.topicId)
    ) as any;
  }

  const results = await db.query.digests.findMany({
    where: whereConditions,
    orderBy: [desc(digests.date)],
    limit,
    with: {
      topic: true,
    },
  });

  return results;
}
