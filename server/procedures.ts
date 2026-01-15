import { timingMiddleware } from "./middleware/timing";
import { authMiddleware, optionalAuthMiddleware } from "./middleware/auth";

/**
 * Public procedure - no authentication required
 * Includes timing middleware for performance monitoring
 */
export const publicProcedure = timingMiddleware;

/**
 * Optional user procedure - authentication optional
 * User context will be null if not authenticated
 */
export const optionalUserProcedure = optionalAuthMiddleware;

/**
 * Protected procedure - authentication required
 * Will throw UNAUTHORIZED error if not authenticated
 */
export const userProcedure = authMiddleware;
