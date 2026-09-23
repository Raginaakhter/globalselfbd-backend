interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up expired records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a request identifier exceeds rate limits
 * @param identifier Unique key (e.g., `login:192.168.1.1` or `otp:user@example.com`)
 * @param maxHits Maximum allowed requests in window
 * @param windowMs Time window in milliseconds
 * @returns `{ allowed: boolean, remaining: number, resetInSeconds: number }`
 */
export function checkRateLimit(
  identifier: string,
  maxHits: number = 5,
  windowMs: number = 15 * 60 * 1000
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(identifier, newRecord);
    return {
      allowed: true,
      remaining: maxHits - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= maxHits) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  record.count += 1;
  rateLimitMap.set(identifier, record);

  return {
    allowed: true,
    remaining: maxHits - record.count,
    resetInSeconds: Math.ceil((record.resetTime - now) / 1000),
  };
}
