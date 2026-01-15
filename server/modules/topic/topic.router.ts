import { z } from "zod";
import { createTRPCRouter } from "@/server/trpc";
import { publicProcedure } from "@/server/procedures";
import { topics } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const topicRouter = createTRPCRouter({
  /**
   * Get all topics
   */
  list: publicProcedure.query(async ({ ctx }) => {
    const items = await ctx.db.query.topics.findMany({
      orderBy: [asc(topics.sortOrder)],
    });

    return items;
  }),

  /**
   * Get a topic by slug
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const topic = await ctx.db.query.topics.findFirst({
        where: eq(topics.slug, input.slug),
      });

      return topic ?? null;
    }),

  /**
   * Get a topic with its articles
   */
  getWithArticles: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const topic = await ctx.db.query.topics.findFirst({
        where: eq(topics.slug, input.slug),
        with: {
          articles: {
            limit: input.limit,
            orderBy: (articles, { desc }) => [desc(articles.publishedAt)],
          },
        },
      });

      return topic ?? null;
    }),
});
