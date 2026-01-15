import { z } from "zod";
import { createTRPCRouter } from "@/server/trpc";
import { publicProcedure, userProcedure } from "@/server/procedures";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const userRouter = createTRPCRouter({
  /**
   * Get the current authenticated user
   */
  me: userProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id!),
    });

    return user ?? null;
  }),

  /**
   * Update user profile
   */
  updateProfile: userProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        image: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({
          ...input,
        })
        .where(eq(users.id, ctx.user.id!))
        .returning();

      return updated;
    }),
});
