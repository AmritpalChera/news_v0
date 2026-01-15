import { z } from "zod";
import { createTRPCRouter } from "@/server/trpc";
import { publicProcedure } from "@/server/procedures";
import {
  fetchAndStoreArticles,
  seedTopics,
  getFetchStats,
} from "@/lib/services/fetcher";

export const fetcherRouter = createTRPCRouter({
  /**
   * Trigger a fetch from GNews
   * In production, this would be called by a cron job
   */
  fetch: publicProcedure
    .input(
      z
        .object({
          max: z.number().min(1).max(100).default(10),
          useAI: z.boolean().default(true),
        })
        .optional()
    )
    .mutation(async ({ input }) => {
      const result = await fetchAndStoreArticles({
        maxArticles: input?.max ?? 50,
        useAI: input?.useAI ?? true,
      });
      return result;
    }),

  /**
   * Seed topics into the database
   */
  seedTopics: publicProcedure.mutation(async () => {
    await seedTopics();
    return { success: true };
  }),

  /**
   * Get fetch statistics
   */
  stats: publicProcedure.query(async () => {
    const stats = await getFetchStats();
    return stats;
  }),
});
