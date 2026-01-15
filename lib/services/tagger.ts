/**
 * Rule-based topic tagger
 * Assigns articles to topics based on keywords and patterns
 */

// ============================================
// Topic Definitions
// ============================================

export const TOPICS = {
  "ai-ml": {
    name: "AI & Machine Learning",
    slug: "ai-ml",
    sortOrder: 1,
  },
  startups: {
    name: "Startups & Funding",
    slug: "startups",
    sortOrder: 2,
  },
  programming: {
    name: "Programming & Dev Tools",
    slug: "programming",
    sortOrder: 3,
  },
  cybersecurity: {
    name: "Cybersecurity",
    slug: "cybersecurity",
    sortOrder: 4,
  },
  "big-tech": {
    name: "Big Tech",
    slug: "big-tech",
    sortOrder: 5,
  },
  crypto: {
    name: "Crypto & Web3",
    slug: "crypto",
    sortOrder: 6,
  },
  hardware: {
    name: "Hardware & Gadgets",
    slug: "hardware",
    sortOrder: 7,
  },
  science: {
    name: "Science & Space",
    slug: "science",
    sortOrder: 8,
  },
} as const;

export type TopicSlug = keyof typeof TOPICS;

// ============================================
// Keyword Rules
// ============================================

const TOPIC_KEYWORDS: Record<TopicSlug, string[]> = {
  "ai-ml": [
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "neural network",
    "chatgpt",
    "gpt-4",
    "gpt-5",
    "openai",
    "anthropic",
    "claude",
    "gemini",
    "llm",
    "large language model",
    "generative ai",
    "midjourney",
    "stable diffusion",
    "dall-e",
    "copilot",
    "ai model",
    "transformer",
    "nlp",
    "computer vision",
    "tensorflow",
    "pytorch",
  ],
  startups: [
    "startup",
    "funding round",
    "series a",
    "series b",
    "series c",
    "seed funding",
    "venture capital",
    "vc",
    "valuation",
    "unicorn",
    "ipo",
    "acquisition",
    "acquired",
    "merger",
    "y combinator",
    "techstars",
    "accelerator",
    "incubator",
    "fundraise",
    "investor",
    "pitch deck",
  ],
  programming: [
    "programming",
    "developer",
    "software engineer",
    "javascript",
    "typescript",
    "python",
    "rust",
    "golang",
    "react",
    "vue",
    "angular",
    "node.js",
    "api",
    "github",
    "gitlab",
    "open source",
    "framework",
    "library",
    "sdk",
    "devops",
    "ci/cd",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "serverless",
    "database",
    "postgresql",
    "mongodb",
    "redis",
    "graphql",
    "rest api",
    "microservices",
  ],
  cybersecurity: [
    "cybersecurity",
    "security",
    "hack",
    "hacker",
    "breach",
    "data leak",
    "vulnerability",
    "malware",
    "ransomware",
    "phishing",
    "zero-day",
    "exploit",
    "encryption",
    "privacy",
    "gdpr",
    "password",
    "authentication",
    "firewall",
    "vpn",
    "ddos",
    "cyber attack",
  ],
  "big-tech": [
    "apple",
    "google",
    "microsoft",
    "amazon",
    "meta",
    "facebook",
    "netflix",
    "tesla",
    "nvidia",
    "intel",
    "amd",
    "qualcomm",
    "samsung",
    "iphone",
    "android",
    "windows",
    "macos",
    "ios",
    "pixel",
    "surface",
    "alexa",
    "siri",
    "tim cook",
    "sundar pichai",
    "satya nadella",
    "mark zuckerberg",
    "elon musk",
    "jeff bezos",
  ],
  crypto: [
    "crypto",
    "cryptocurrency",
    "bitcoin",
    "ethereum",
    "blockchain",
    "web3",
    "nft",
    "defi",
    "decentralized",
    "token",
    "wallet",
    "binance",
    "coinbase",
    "solana",
    "cardano",
    "dogecoin",
    "mining",
    "staking",
    "smart contract",
    "dao",
    "metaverse",
  ],
  hardware: [
    "hardware",
    "gadget",
    "device",
    "smartphone",
    "laptop",
    "tablet",
    "wearable",
    "smartwatch",
    "headphone",
    "earbuds",
    "vr headset",
    "ar glasses",
    "chip",
    "processor",
    "gpu",
    "cpu",
    "memory",
    "ssd",
    "display",
    "oled",
    "battery",
    "charger",
    "robot",
    "drone",
    "ev",
    "electric vehicle",
  ],
  science: [
    "science",
    "space",
    "nasa",
    "spacex",
    "rocket",
    "satellite",
    "mars",
    "moon",
    "asteroid",
    "telescope",
    "quantum",
    "physics",
    "biology",
    "climate",
    "research",
    "discovery",
    "experiment",
    "laboratory",
    "scientist",
    "breakthrough",
  ],
};

// ============================================
// Tagger Function
// ============================================

export type TagSource = "rule" | "ai";

export interface TagResult {
  topicSlug: TopicSlug | null;
  confidence: number;
  source: TagSource;
  matchedKeywords?: string[];
  reasoning?: string;
}

// Confidence threshold below which we fall back to AI
const AI_FALLBACK_THRESHOLD = 0.33; // Less than 1 keyword match

/**
 * Tag an article with a topic using rule-based matching
 */
export function tagArticleWithRules(
  title: string,
  description?: string
): TagResult {
  const text = `${title} ${description || ""}`.toLowerCase();

  let bestMatch: TagResult = {
    topicSlug: null,
    confidence: 0,
    source: "rule",
    matchedKeywords: [],
  };

  for (const [slug, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const matchedKeywords = keywords.filter((keyword) =>
      text.includes(keyword.toLowerCase())
    );

    // Calculate confidence based on number of matches
    const confidence = Math.min(matchedKeywords.length / 3, 1); // Cap at 1.0

    if (matchedKeywords.length > (bestMatch.matchedKeywords?.length || 0)) {
      bestMatch = {
        topicSlug: slug as TopicSlug,
        confidence,
        source: "rule",
        matchedKeywords,
      };
    }
  }

  return bestMatch;
}

/**
 * Tag an article with a topic - uses rules first, AI fallback if uncertain
 */
export async function tagArticle(
  title: string,
  description?: string,
  options: { useAI?: boolean } = {}
): Promise<TagResult> {
  const { useAI = true } = options;

  // First try rule-based tagging
  const ruleResult = tagArticleWithRules(title, description);

  // If confident enough, use rule result
  if (ruleResult.confidence >= AI_FALLBACK_THRESHOLD) {
    return ruleResult;
  }

  // If AI is disabled or no API key, return rule result anyway
  if (!useAI || !process.env.OPENAI_API_KEY) {
    return ruleResult;
  }

  // Fall back to AI
  try {
    const { aiTagArticle } = await import("./ai");
    const aiResult = await aiTagArticle(title, description);

    return {
      topicSlug: aiResult.topicSlug,
      confidence: aiResult.confidence,
      source: "ai",
      reasoning: aiResult.reasoning,
    };
  } catch (error) {
    console.error("AI tagging failed, using rule result:", error);
    return ruleResult;
  }
}

/**
 * Get all topic definitions for seeding the database
 */
export function getAllTopics() {
  return Object.values(TOPICS);
}
