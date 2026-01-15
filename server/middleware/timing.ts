import { baseProcedure } from "../trpc";

/**
 * Middleware that logs procedure execution time
 */
export const timingMiddleware = baseProcedure.use(async ({ path, next }) => {
  const start = Date.now();

  const result = await next();

  const duration = Date.now() - start;
  console.log(`[tRPC] ${path} took ${duration}ms`);

  return result;
});
