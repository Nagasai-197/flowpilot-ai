import rateLimit from "express-rate-limit";

/**
 * Reusable Rate Limiter Factory.
 * To activate a production distributed Redis store:
 * 1. Install packages: npm install ioredis rate-limit-redis
 * 2. Import RedisStore: import RedisStore from 'rate-limit-redis'
 * 3. Import Redis client: import Redis from 'ioredis'
 * 4. Pass client option: store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) })
 */
export function createLimiter(limit: number, windowMs: number, message: string) {
  return rateLimit({
    windowMs,
    max: limit,
    standardHeaders: true, // Return rate limit info in standard RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* legacy headers
    message: {
      status: "error",
      message,
    },
    // Allows proper operation behind reverse proxies like Vercel & Render
    validate: { trustProxy: false },
  });
}

/**
 * Original backward-compatible rate limiter middleware.
 * Maps seamlessly to express-rate-limit while keeping original routes intact.
 */
export function rateLimitMiddleware(limit: number, windowMs: number) {
  return createLimiter(
    limit,
    windowMs,
    "Too many requests to FlowPilot AI. Please wait a moment and try again.",
  );
}

// Preserve original export name to prevent compilation or route breakage
export { rateLimitMiddleware as rateLimit };

// Standardized ready-to-use limiters for controllers and sub-routes
export const globalLimiter = createLimiter(
  100,
  60 * 1000, // 1 minute
  "Too many requests. Please slow down.",
);

export const authLimiter = createLimiter(
  10,
  60 * 1000, // 1 minute
  "Too many authentication attempts. Please try again in a minute.",
);

export const aiLimiter = createLimiter(
  5,
  60 * 1000, // 1 minute
  "Too many AI requests. Please wait a moment and try again.",
);
