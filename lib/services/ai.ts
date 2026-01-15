import { openai } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { TOPICS, type TopicSlug } from "./tagger";

// ============================================
// Models
// ============================================

const DEFAULT_MODEL = "gpt-4o-mini"; // Fast and cheap for tagging

// ============================================
// AI Topic Tagging
// ============================================

const topicSlugs = Object.keys(TOPICS) as TopicSlug[];

const TagResultSchema = z.object({
  topicSlug: z.enum(topicSlugs as [TopicSlug, ...TopicSlug[]]).nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type AITagResult = z.infer<typeof TagResultSchema>;

/**
 * Use AI to tag an article with a topic
 */
export async function aiTagArticle(
  title: string,
  description?: string
): Promise<AITagResult> {
  const topicDescriptions = Object.entries(TOPICS)
    .map(([slug, topic]) => `- ${slug}: ${topic.name}`)
    .join("\n");

  const prompt = `You are a tech news categorizer. Analyze the following article and assign it to the most appropriate topic.

Available topics:
${topicDescriptions}

Article title: ${title}
${description ? `Article description: ${description}` : ""}

Rules:
- Choose the single best-matching topic
- If the article doesn't clearly fit any topic, set topicSlug to null
- Confidence should be 0.0-1.0 based on how well it matches
- Provide brief reasoning for your choice`;

  try {
    const result = await generateObject({
      model: openai(DEFAULT_MODEL),
      schema: TagResultSchema,
      prompt,
    });

    return result.object;
  } catch (error) {
    console.error("AI tagging failed:", error);
    return {
      topicSlug: null,
      confidence: 0,
      reasoning: "AI tagging failed",
    };
  }
}

// ============================================
// AI Digest Generation
// ============================================

export interface ArticleForDigest {
  title: string;
  description?: string;
  publisherName?: string;
  url: string;
}

export interface DigestResult {
  title: string;
  content: string;
  model: string;
}

/**
 * Generate a daily digest summary from articles
 */
export async function generateDigest(
  articles: ArticleForDigest[],
  options: {
    topicName?: string; // e.g., "AI & Machine Learning" or null for global
    date: Date;
  }
): Promise<DigestResult> {
  const { topicName, date } = options;
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const scope = topicName ? `${topicName} news` : "tech news";

  const articleList = articles
    .map(
      (a, i) =>
        `${i + 1}. "${a.title}"${a.publisherName ? ` (${a.publisherName})` : ""}${a.description ? `\n   ${a.description}` : ""}`
    )
    .join("\n\n");

  const prompt = `You are a tech news editor. Write a brief daily digest of today's ${scope}.

Date: ${dateStr}
${topicName ? `Topic: ${topicName}` : ""}

Articles:
${articleList}

Instructions:
- Write 2-3 short paragraphs MAX (under 150 words total)
- Lead with the biggest story
- Be direct and punchy - no fluff
- Synthesize themes, don't list headlines
- Skip minor stories if needed

Write the digest:`;

  try {
    const result = await generateText({
      model: openai(DEFAULT_MODEL),
      prompt,
    });

    // Generate a title for the digest
    const titleResult = await generateText({
      model: openai(DEFAULT_MODEL),
      prompt: `Write a catchy 5-7 word title for this digest:\n\n${result.text}\n\nTitle:`,
    });

    return {
      title: titleResult.text.trim().replace(/^["']|["']$/g, ""),
      content: result.text,
      model: DEFAULT_MODEL,
    };
  } catch (error) {
    console.error("Digest generation failed:", error);
    throw new Error("Failed to generate digest");
  }
}
