interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface ConsumeRateLimitInput {
  namespace: string;
  identifier: string;
  limit: number;
  windowMs: number;
}

interface ConsumeRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

declare global {
  var __rateLimitBuckets: Map<string, RateLimitBucket> | undefined;
}

const buckets = global.__rateLimitBuckets ?? new Map<string, RateLimitBucket>();

if (process.env.NODE_ENV !== "production") {
  global.__rateLimitBuckets = buckets;
}

function buildBucketKey(namespace: string, identifier: string) {
  return `${namespace}:${identifier}`;
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    if (firstIp?.trim()) {
      return firstIp.trim();
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) {
    return realIp.trim();
  }

  return "unknown";
}

export function consumeRateLimit(input: ConsumeRateLimitInput): ConsumeRateLimitResult {
  const now = Date.now();
  const key = buildBucketKey(input.namespace, input.identifier);
  const existingBucket = buckets.get(key);

  if (!existingBucket || existingBucket.resetAt <= now) {
    const resetAt = now + input.windowMs;
    buckets.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      remaining: Math.max(0, input.limit - 1),
      retryAfterSeconds: Math.max(1, Math.ceil(input.windowMs / 1000)),
    };
  }

  if (existingBucket.count >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existingBucket.resetAt - now) / 1000)),
    };
  }

  existingBucket.count += 1;
  buckets.set(key, existingBucket);

  return {
    allowed: true,
    remaining: Math.max(0, input.limit - existingBucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existingBucket.resetAt - now) / 1000)),
  };
}
