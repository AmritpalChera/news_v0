import { z } from "zod";
import { createTRPCRouter } from "@/server/trpc";
import { publicProcedure } from "@/server/procedures";
import {
  generateDailyDigest,
  generateAllDailyDigests,
  getLatestDigest,
  getDigests,
} from "@/lib/services/digest";

export const digestRouter = createTRPCRouter({
  /**
   * Generate a daily digest
   * Can be global (no topicId) or topic-specific
   */
  generate: publicProcedure
    .input(
      z
        .object({
          topicId: z.string().uuid().nullable().optional(),
          date: z.string().datetime().optional(),
          forceRegenerate: z.boolean().default(false),
          maxArticles: z.number().min(1).max(100).default(70),
        })
        .optional()
    )
    .mutation(async ({ input }) => {
      const result = await generateDailyDigest({
        topicId: input?.topicId ?? null,
        date: input?.date ? new Date(input.date) : new Date(),
        forceRegenerate: input?.forceRegenerate ?? false,
        maxArticles: input?.maxArticles ?? 70,
      });

      return result;
    }),

  /**
   * Generate digests for all topics + global
   * Typically called by a daily cron job
   */
  generateAll: publicProcedure
    .input(
      z
        .object({
          date: z.string().datetime().optional(),
          forceRegenerate: z.boolean().default(false),
        })
        .optional()
    )
    .mutation(async ({ input }) => {
      const result = await generateAllDailyDigests({
        date: input?.date ? new Date(input.date) : new Date(),
        forceRegenerate: input?.forceRegenerate ?? false,
      });

      return result;
    }),

  /**
   * Get the latest digest (global or topic-specific)
   */
  latest: publicProcedure
    .input(
      z
        .object({
          topicId: z.string().uuid().nullable().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const digest = await getLatestDigest(input?.topicId);
      return digest ?? null;
    }),

  /**
   * List digests with filters
   */
  list: publicProcedure
    .input(
      z
        .object({
          type: z.enum(["daily", "weekly"]).default("daily"),
          topicId: z.string().uuid().nullable().optional(),
          limit: z.number().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const digests = await getDigests({
        type: input?.type ?? "daily",
        topicId: input?.topicId,
        limit: input?.limit ?? 10,
      });

      return digests;
    }),
});
