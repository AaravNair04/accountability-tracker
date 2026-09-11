import { NextResponse } from "next/server";


type RateLimitBucket = {
  count: number;
  resetAt: number;
};


type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};


const globalForRateLimit =
  globalThis as typeof globalThis & {
    __accountabilityRateLimitStore?: Map<string, RateLimitBucket>;
  };


const rateLimitStore =
  globalForRateLimit.__accountabilityRateLimitStore ??
  new Map<string, RateLimitBucket>();


globalForRateLimit.__accountabilityRateLimitStore = rateLimitStore;


function pruneExpiredBuckets(now: number) {
  if (rateLimitStore.size < 1000) {
    return;
  }

  for (const [bucketKey, bucket] of rateLimitStore.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitStore.delete(bucketKey);
    }
  }
}


export function checkRateLimit({
  key,
  limit,
  windowMs
}: RateLimitOptions) {
  const now = Date.now();

  pruneExpiredBuckets(now);

  const existingBucket = rateLimitStore.get(key);

  if (!existingBucket || existingBucket.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs
    });

    return {
      allowed: true,
      retryAfterSeconds: 0
    };
  }

  if (existingBucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existingBucket.resetAt - now) / 1000)
    };
  }

  existingBucket.count += 1;

  return {
    allowed: true,
    retryAfterSeconds: 0
  };
}


export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: "Too many requests. Please try again shortly."
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds)
      }
    }
  );
}
