/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Suitable for single-process deployments (development, single-instance
 * server). For multi-instance deployments, replace the in-memory store
 * with a shared store (e.g. Redis via ioredis).
 */

interface Window {
  timestamps: number[];
}

const store = new Map<string, Window>();

/**
 * Check whether a key is within the allowed rate.
 *
 * @param key      Unique identifier (e.g. `auth:127.0.0.1`)
 * @param limit    Maximum number of requests allowed per window
 * @param windowMs Duration of the sliding window in milliseconds
 * @returns `true` if the request is allowed, `false` if rate-limited
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;

  const entry = store.get(key) ?? { timestamps: [] };

  // Drop timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    store.set(key, entry);
    return false; // rate-limited
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return true; // allowed
}

// Periodically prune stale entries to prevent unbounded memory growth
// (runs every 10 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const cutoff = Date.now() - 15 * 60 * 1000; // 15 min max window
      for (const [key, entry] of store.entries()) {
        entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
        if (entry.timestamps.length === 0) {
          store.delete(key);
        }
      }
    },
    10 * 60 * 1000,
  );
}
