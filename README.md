# Tech News Aggregator

> AI-powered tech news digest that summarizes the hottest stories from across the web.

**Live:** https://news-v0-khaki.vercel.app

---

## What It Does

- Aggregates tech news from multiple sources (GNews, with more coming)
- Auto-categorizes articles into 8 topics using smart tagging (rules + AI fallback)
- Generates concise AI-powered daily digests (global and per-topic)
- Creates unique AI-generated artwork for each digest using DALL-E 3

---

## Key Architectural Decisions

### 1. Smart Tagging: Rules First, AI Fallback

Instead of sending every article to OpenAI (expensive, slow), we use a hybrid approach:

```
Article arrives → Rule-based keyword matching → Confidence >= 33%? → Use it
                                                      ↓ NO
                                              AI fallback (GPT-4o-mini)
```

This keeps costs low while maintaining accuracy. ~80% of articles are tagged by rules.

### 2. URL-Based Deduplication

Same story from multiple APIs? We hash the canonical URL (SHA-256) and reject duplicates:

- Normalize: lowercase, strip trailing slashes, remove tracking params (utm_*, fbclid)
- Unique constraint on `urlHash` in database
- Different publishers covering same story = separate articles (AI digest consolidates them naturally)


### 3. "Hottest" = Last 24 Hours

Date filtering happens at the API level (GNews `from` parameter), not in our database. This:
- Reduces API calls
- Keeps data fresh
- Simplifies queries

### 4. Concise Digests

AI generates 2-3 short paragraphs (~150 words), not walls of text. The prompt:
- Leads with the biggest story
- Synthesizes themes (doesn't list headlines)
- Skips minor stories

### 5. AI-Generated Digest Images

Each digest gets a unique DALL-E 3 image:
- Abstract, cartoonish style
- No text/labels in the image
- Visually represents the main themes
- 1792x1024 resolution

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| API | tRPC |
| Database | PostgreSQL (Neon) |
| ORM | Drizzle |
| Auth | NextAuth v5 (Google) |
| Styling | Tailwind CSS |
| AI | OpenAI (GPT-4o-mini, DALL-E 3) |

---

## Project Structure

```
news/
├── app/                    # Next.js App Router
│   └── (main)/
│       ├── dashboard/      # Main dashboard with digest
│       ├── browse/         # Paginated article browser
│       ├── topic/[slug]/   # Topic-specific pages
│       └── login/          # Auth page
├── db/
│   └── schema.ts           # Drizzle schema (7 tables)
├── lib/services/           # Business logic
│   ├── gnews.ts            # GNews API client
│   ├── tagger.ts           # Rule-based + AI tagging
│   ├── ai.ts               # OpenAI integration
│   ├── fetcher.ts          # Fetch orchestration
│   ├── digest.ts           # Digest generation
│   └── hash.ts             # URL hashing for dedup
├── server/
│   ├── modules/            # tRPC routers
│   └── auth.ts             # NextAuth config
└── .claude/
    └── app_architecture.md # Detailed architecture docs
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `GNEWS_API_KEY` - Get from https://gnews.io
- `OPENAI_API_KEY` - Get from https://platform.openai.com
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google Cloud Console

### 3. Push database schema

```bash
npx drizzle-kit push
```

### 4. Run development server

```bash
npm run dev
```

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `fetcher.fetch` | Mutation | Fetch articles from GNews |
| `fetcher.stats` | Query | Article counts by topic |
| `digest.generate` | Mutation | Generate digest (global or topic) |
| `digest.latest` | Query | Get most recent digest |
| `article.browse` | Query | Paginated articles (infinite scroll) |
| `article.recent` | Query | Articles from last N hours |
| `topic.getWithArticles` | Query | Topic with its articles |

---

## Topics

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

---

## Future Ideas

- Email digests (daily/weekly)
- User bookmarks
- Reading history
- Personalized topic weights
- Additional news sources (NewsData, NewsAPI)
- Trending sub-topics within categories

---

## Future Enhancements

1. Handling articles at scale -> currently the system can only handle a small number of articles, up to 50 for the daily digest. Instead, we can build a buffer and stitch together summaries if we have more articles to generate high quality summaries at scale.

2. Better UI that is more visually appealing. Currently we use a minimal approach to keep the product from having any strong design bias.

3. Bookmarking articles, and when we click into articles, we can also keep that data on our own site and also digest that with AI.

4. Cron jobs - new articles are automatically pulled in instead of having to press the "refresh button". 

5. Notifications - you can automatically get notifications for the "interested" topics

6. Research deeper - if you find an interesting article, you can click "tell me more" for an agent to get more info on the topic.

...etc.




