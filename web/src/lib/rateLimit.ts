import { NextResponse } from "next/server";


export type RateLimitBucket = {
  count: number;
  resetAt: number;
};


export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};


export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};


export type RateLimitStore = {
  consume: (
    options: RateLimitOptions & {
      now: number;
    }
  ) => Promise<RateLimitResult>;
};


export function createInMemoryRateLimitStore(): RateLimitStore {
  const buckets =
    new Map<string, RateLimitBucket>();

  function pruneExpiredBuckets(now: number) {
    if (buckets.size < 1000) {
      return;
    }

    for (const [bucketKey, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(bucketKey);
      }
    }
  }

  return {
    async consume({
      key,
      limit,
      windowMs,
      now
    }) {
      pruneExpiredBuckets(now);

      const existingBucket =
        buckets.get(key);

      if (
        !existingBucket ||
        existingBucket.resetAt <= now
      ) {
        buckets.set(
          key,
          {
            count:
              1,

            resetAt:
              now + windowMs
          }
        );

        return {
          allowed:
            true,

          retryAfterSeconds:
            0
        };
      }

      if (
        existingBucket.count >= limit
      ) {
        return {
          allowed:
            false,

          retryAfterSeconds:
            Math.ceil(
              (existingBucket.resetAt - now) /
                1000
            )
        };
      }

      existingBucket.count += 1;

      return {
        allowed:
          true,

        retryAfterSeconds:
          0
      };
    }
  };
}


const databaseRateLimitStore: RateLimitStore = {
  async consume({
    key,
    limit,
    windowMs,
    now
  }) {
    const {
      prisma
    } = await import("@/lib/prisma");

    const nowDate =
      new Date(now);

    const existingBucket =
      await prisma.rateLimitBucket.findUnique({
        where: {
          key
        }
      });

    if (
      !existingBucket ||
      existingBucket.resetAt <= nowDate
    ) {
      await prisma.rateLimitBucket.upsert({
        where: {
          key
        },

        update: {
          count:
            1,

          resetAt:
            new Date(
              now + windowMs
            )
        },

        create: {
          key,

          count:
            1,

          resetAt:
            new Date(
              now + windowMs
            )
        }
      });

      return {
        allowed:
          true,

        retryAfterSeconds:
          0
      };
    }

    if (
      existingBucket.count >= limit
    ) {
      return {
        allowed:
          false,

        retryAfterSeconds:
          Math.ceil(
            (
              existingBucket.resetAt.getTime() -
              now
            ) /
              1000
          )
      };
    }

    await prisma.rateLimitBucket.update({
      where: {
        key
      },

      data: {
        count: {
          increment:
            1
        }
      }
    });

    if (
      Math.random() < 0.01
    ) {
      await prisma.rateLimitBucket.deleteMany({
        where: {
          resetAt: {
            lt:
              nowDate
          }
        }
      });
    }

    return {
      allowed:
        true,

      retryAfterSeconds:
        0
    };
  }
};


export async function checkRateLimit(
  options: RateLimitOptions,
  store: RateLimitStore = databaseRateLimitStore
) {
  return store.consume({
    ...options,
    now:
      Date.now()
  });
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
