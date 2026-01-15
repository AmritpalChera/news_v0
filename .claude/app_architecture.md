# Tech News Aggregator - App Architecture

> A website that summarizes the hottest tech news from multiple sources.

---

## Overview

This app aggregates tech news from multiple APIs, categorizes them by topic using smart tagging (rules + AI fallback), and generates AI-powered daily digests at both global and per-topic levels.

---

## Data Sources

### News APIs

| Provider | URL | Status | Free Tier |
|----------|-----|--------|-----------|
| GNews | https://gnews.io | ✅ Implemented | 100 req/day |
| NewsData | https://newsdata.io | 🔜 Coming | 200 req/day |
| NewsAPI | https://newsapi.org | 🔜 Coming | 100 req/day |

Each provider returns articles from various publishers (TechCrunch, The Verge, Ars Technica, etc.).

### GNews Configuration

**"Hottest" = Last 24 Hours**

The app focuses on the hottest/most recent tech news by filtering at the API level:

```typescript
// Default fetch parameters
query: "technology OR tech OR software OR AI OR startup"
from: 24 hours ago (ISO 8601)
endpoint: /search (supports date filtering)
```

Date filtering happens at the GNews API level using the `from` parameter, ensuring we only fetch recent articles and don't waste API calls on old content.

---

## Topics Strategy

### Approach: Hybrid - Shipped in 2 Phases

#### Phase 1: MVP (Stable UI) ✅

**Fixed parent topics with stable slugs:**

| Topic | Slug |
|-------|------|
| AI & Machine Learning | `ai-ml` |
| Startups & Funding | `startups` |
| Programming & Dev Tools | `programming` |
| Cybersecurity | `cybersecurity` |
| Big Tech | `big-tech` |
| Crypto & Web3 | `crypto` |
| Hardware & Gadgets | `hardware` |
| Science & Space | `science` |

**Smart Tagging (implemented):**

```
Article arrives
      ↓
Rule-based matching (keyword lists)
      ↓
Confidence >= 33%? ─── YES ──→ Use rule result
      ↓ NO
OPENAI_API_KEY set? ─── NO ──→ Use rule result anyway
      ↓ YES
AI fallback (GPT-4o-mini)
      ↓
Return AI result with reasoning
```

Each article gets assigned to **one primary topic** (simplest model).

#### Phase 2: Trend Layer (Non-UI-Breaking)

- Add **dynamic sub-topics** as *labels*, not navigation
- Examples: "OpenAI", "Apple Vision Pro", "NVIDIA earnings"
- Appear inside parent topic pages as "Trending today"

**Result:** Stable navigation + adaptive discovery

---

## Deduplication Strategy

### Problem

Same news story appears across multiple APIs (GNews + NewsAPI both return same TechCrunch article).

### Solution: URL-Based Deduplication

If the **same canonical publisher URL** appears from multiple APIs → reject the duplicate.

- Implementation: unique constraint on `urlHash` (SHA-256 of normalized URL)
- URL normalization: lowercase, remove trailing slashes, strip tracking params (utm_*, fbclid, etc.)
- Prevents worst UX: seeing same TechCrunch link 3 times

**Note:** Different publishers covering the same story (Verge + TechCrunch both writing about OpenAI) are treated as separate articles. The AI digest will naturally consolidate these when summarizing.

---

## Summaries & Digests

### Summary Types

| Type | Scope | Frequency | Content |
|------|-------|-----------|---------|
| Daily Digest (Global) | All topics | Daily | Top articles across all tech news |
| Daily Digest (Per-Topic) | Single topic | Daily | Top articles in AI, Startups, etc. |
| Weekly Digest | All or per-topic | Weekly | Week's highlights |

### AI Digest Generation

**Model:** GPT-4o (for quality summaries)

**Process:**
1. Fetch articles from last 24 hours (limit 20)
2. Format articles with title, description, publisher
3. Send to GPT-4o with instructions to synthesize (not list)
4. Generate catchy title with GPT-4o-mini
5. Store digest with model info

**Key Design Decision:** Digests summarize articles directly. The AI handles deduplication naturally by consolidating similar coverage into coherent summaries.

---

## Service Layer

### Services (`lib/services/`)

| Service | File | Purpose |
|---------|------|---------|
| GNews Client | `gnews.ts` | Fetch articles from GNews API |
| URL Hasher | `hash.ts` | SHA-256 hashing with URL normalization |
| Tagger | `tagger.ts` | Rule-based + AI fallback topic tagging |
| AI | `ai.ts` | OpenAI integration (tagging + digests) |
| Fetcher | `fetcher.ts` | Orchestrates fetch → tag → store |
| Digest | `digest.ts` | Generate and manage daily digests |

### AI Service (`lib/services/ai.ts`)

**Functions:**

| Function | Model | Purpose |
|----------|-------|---------|
| `aiTagArticle()` | GPT-4o-mini | Classify article into topic with reasoning |
| `generateDigest()` | GPT-4o | Create cohesive news summary |

**Structured Output:** Uses Vercel AI SDK's `generateObject()` for type-safe AI responses.

---

## tRPC API Routes

### Fetcher Routes

| Route | Method | Description |
|-------|--------|-------------|
| `fetcher.fetch` | Mutation | Fetch articles from GNews |
| `fetcher.seedTopics` | Mutation | Seed topics into database |
| `fetcher.stats` | Query | Get article counts by topic |

**Fetch Input:**
```typescript
{
  max?: number;    // 1-100, default 10
  useAI?: boolean; // default true
}
```

**Fetch Output:**
```typescript
{
  fetched: number;
  inserted: number;
  duplicates: number;
  taggedByRule: number;
  taggedByAI: number;
  untagged: number;
  errors: string[];
}
```

### Digest Routes

| Route | Method | Description |
|-------|--------|-------------|
| `digest.generate` | Mutation | Generate single digest (global or topic) |
| `digest.generateAll` | Mutation | Generate all digests (for cron) |
| `digest.latest` | Query | Get most recent digest |
| `digest.list` | Query | List digests with filters |

### Article Routes

| Route | Method | Description |
|-------|--------|-------------|
| `article.list` | Query | List articles with topic filter |
| `article.getById` | Query | Get single article |
| `article.recent` | Query | Get articles from last N hours |

### Topic Routes

| Route | Method | Description |
|-------|--------|-------------|
| `topic.list` | Query | List all topics |
| `topic.getBySlug` | Query | Get topic by slug |
| `topic.getWithArticles` | Query | Get topic with its articles |

### User Routes (Auth Required)

| Route | Method | Description |
|-------|--------|-------------|
| `user.me` | Query | Get current user |
| `user.updateProfile` | Mutation | Update user profile |

---

## Database Schema

### Minimal Schema: 7 Tables

```
┌─────────────────────────────────────────────────────────────────────┐
│                        APP TABLES (3)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  topics                       articles                              │
│  ──────                       ────────                              │
│  id                           id                                    │
│  name                         topicId → topics                      │
│  slug                         sourceName (string)                   │
│  description                  title                                 │
│  sortOrder                    description                           │
│                               content                               │
│                               author                                │
│                               publisherName                         │
│                               url                                   │
│                               urlHash (unique, for dedup)           │
│                               imageUrl                              │
│                               publishedAt                           │
│                               fetchedAt                             │
│                                                                     │
│  digests                                                            │
│  ───────                                                            │
│  id                                                                 │
│  type (daily | weekly)                                              │
│  topicId → topics (nullable for global)                             │
│  date                                                               │
│  title                                                              │
│  content (AI summary)                                               │
│  model (gpt-4o, etc.)                                               │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                   USER TABLES (4) - NextAuth                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  users                        accounts                              │
│  ─────                        ────────                              │
│  id                           userId → users                        │
│  name                         provider                              │
│  email                        providerAccountId                     │
│  emailVerified                access_token, refresh_token, etc.     │
│  image                                                              │
│                                                                     │
│  sessions                     verification_tokens                   │
│  ────────                     ───────────────────                   │
│  sessionToken                 identifier                            │
│  userId → users               token                                 │
│  expires                      expires                               │
│                                                                     │
│  (Future: bookmarks, preferences, reading history)                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### What We Removed (Kept Simple)

| Removed | Why |
|---------|-----|
| `sources` table | Just a string field (`sourceName`) on articles |
| `article_topics` M2M | Single `topicId` FK per article |
| `stories` + `story_articles` | AI digest handles consolidation naturally |
| `digest_stories` | Don't need to track which articles are in a digest |

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# News APIs
GNEWS_API_KEY=xxx
# NEWSDATA_API_KEY=xxx  (coming soon)
# NEWSAPI_API_KEY=xxx   (coming soon)

# AI
OPENAI_API_KEY=xxx

# Auth (optional, for future features)
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

---

## Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   News APIs  │────▶│   Fetcher    │────▶│   Articles   │
│   (GNews)    │     │              │     │  (deduped)   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Tagger     │
                     │ Rules first  │
                     │ AI fallback  │
                     └──────────────┘
                            │
                            ▼
┌──────────────┐     ┌──────────────┐
│   Digests    │◀────│ Summarizer   │
│   (stored)   │     │  (GPT-4o)    │
└──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│   Frontend   │
│  (Next.js)   │
└──────────────┘
```

---

## Key Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| articles | `url_hash` (unique) | Dedup - prevent duplicate URLs |
| articles | `published_at` | Sort by recency |
| articles | `topic_id` | Filter by topic |
| digests | `type, topic_id, date` (unique) | One digest per type/topic/date |
| digests | `date` | Fetch by date |

---

## Cron Jobs (Production)

| Job | Schedule | Action |
|-----|----------|--------|
| Fetch Articles | Every 2 hours | `fetcher.fetch({ max: 50 })` |
| Generate Digests | Daily at 6 AM | `digest.generateAll()` |

---

## Future Considerations

- **User bookmarks** - Save articles for later
- **Reading history** - Track what user has seen
- **Personalization** - Weight topics by user interest
- **Email digests** - Send daily/weekly summaries
- **Trending sub-topics** - Phase 2 dynamic labels
- **Story clustering** - Group related articles (if needed later)
- **Additional news sources** - NewsData, NewsAPI

---

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **API Layer**: tRPC
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle
- **Auth**: NextAuth v5 (Google provider)
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Vercel AI SDK + OpenAI (GPT-4o, GPT-4o-mini)
