import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ============================================
// Enums
// ============================================

export const digestTypeEnum = pgEnum("digest_type", ["daily", "weekly"]);

// ============================================
// NextAuth Tables (for future use)
// ============================================

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// ============================================
// Topics (Fixed Categories)
// ============================================

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================
// Articles (News from APIs)
// ============================================

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    topicId: uuid("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),

    // Source (just a string, no separate table)
    sourceName: varchar("source_name", { length: 100 }), // GNews, NewsAPI, NewsData

    // Content
    title: text("title").notNull(),
    description: text("description"),
    content: text("content"),
    author: varchar("author", { length: 255 }),

    // Publisher
    publisherName: varchar("publisher_name", { length: 255 }),

    // URLs
    url: text("url").notNull(),
    urlHash: varchar("url_hash", { length: 64 }).notNull(), // SHA-256 for dedup
    imageUrl: text("image_url"),

    // Timestamps
    publishedAt: timestamp("published_at", { mode: "date" }).notNull(),
    fetchedAt: timestamp("fetched_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("articles_url_hash_idx").on(t.urlHash),
    index("articles_published_at_idx").on(t.publishedAt),
    index("articles_topic_id_idx").on(t.topicId),
  ]
);

// ============================================
// Digests (AI Summaries)
// ============================================

export const digests = pgTable(
  "digests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: digestTypeEnum("type").notNull(),
    topicId: uuid("topic_id").references(() => topics.id, {
      onDelete: "cascade",
    }), // null = global digest
    date: timestamp("date", { mode: "date" }).notNull(),
    title: varchar("title", { length: 500 }),
    content: text("content").notNull(),
    model: varchar("model", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("digests_type_topic_date_idx").on(t.type, t.topicId, t.date),
    index("digests_date_idx").on(t.date),
  ]
);

// ============================================
// Relations
// ============================================

export const topicsRelations = relations(topics, ({ many }) => ({
  articles: many(articles),
  digests: many(digests),
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  topic: one(topics, {
    fields: [articles.topicId],
    references: [topics.id],
  }),
}));

export const digestsRelations = relations(digests, ({ one }) => ({
  topic: one(topics, {
    fields: [digests.topicId],
    references: [topics.id],
  }),
}));

// ============================================
// Type Exports
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

export type Digest = typeof digests.$inferSelect;
export type NewDigest = typeof digests.$inferInsert;
