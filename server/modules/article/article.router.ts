import { z } from "zod";
import { createTRPCRouter } from "@/server/trpc";
import { publicProcedure } from "@/server/procedures";
import { articles } from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

export const articleRouter = createTRPCRouter({
  /**
   * Get recent articles, optionally filtered by topic
   */
  list: publicProcedure
    .input(
      z
        .object({
          topicId: z.string().uuid().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { topicId, limit = 20, offset = 0 } = input ?? {};

      const conditions = topicId ? eq(articles.topicId, topicId) : undefined;

      const items = await ctx.db.query.articles.findMany({
        where: conditions,
        orderBy: [desc(articles.publishedAt)],
        limit,
        offset,
        with: {
          topic: true,
        },
      });

      return items;
    }),

  /**
   * Get a single article by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const article = await ctx.db.query.articles.findFirst({
        where: eq(articles.id, input.id),
        with: {
          topic: true,
        },
      });

      return article ?? null;
    }),

  /**
   * Get articles from the last N hours
   */
  recent: publicProcedure
    .input(
      z
        .object({
          hours: z.number().min(1).max(168).default(24), // Max 1 week
          topicId: z.string().uuid().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { hours = 24, topicId } = input ?? {};

      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const conditions = topicId
        ? and(eq(articles.topicId, topicId), gte(articles.publishedAt, since))
        : gte(articles.publishedAt, since);

      const items = await ctx.db.query.articles.findMany({
        where: conditions,
        orderBy: [desc(articles.publishedAt)],
        with: {
          topic: true,
        },
      });

      return items;
    }),
});
