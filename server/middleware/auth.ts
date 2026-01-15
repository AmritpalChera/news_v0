import { TRPCError } from "@trpc/server";
import { timingMiddleware } from "./timing";

/**
 * Middleware that enforces user authentication
 */
export const authMiddleware = timingMiddleware.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user,
      session: ctx.session,
    },
  });
});

/**
 * Middleware that allows unauthenticated requests but enriches context if authenticated
 */
export const optionalAuthMiddleware = timingMiddleware.use(
  async ({ ctx, next }) => {
    return next({
      ctx: {
        ...ctx,
        user: ctx.session?.user ?? null,
      },
    });
  }
);
