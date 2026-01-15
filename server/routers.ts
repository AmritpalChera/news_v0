import { createTRPCRouter } from "./trpc";
import { userRouter } from "./modules/user/user.router";
import { articleRouter } from "./modules/article/article.router";
import { topicRouter } from "./modules/topic/topic.router";
import { fetcherRouter } from "./modules/fetcher/fetcher.router";
import { digestRouter } from "./modules/digest/digest.router";

/**
 * Main application router
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  article: articleRouter,
  topic: topicRouter,
  fetcher: fetcherRouter,
  digest: digestRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
