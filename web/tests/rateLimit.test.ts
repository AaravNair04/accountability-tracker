import assert from "node:assert/strict";
import test from "node:test";

import {
  checkRateLimit,
  createInMemoryRateLimitStore
} from "../src/lib/rateLimit";


test(
  "blocks requests after the configured limit until the window resets",
  async () => {
    const originalNow =
      Date.now;

    const store =
      createInMemoryRateLimitStore();

    let now =
      1000;

    Date.now =
      () => now;

    try {
      const key =
        `test:${crypto.randomUUID()}`;

      assert.deepEqual(
        await checkRateLimit({
          key,
          limit:
            2,
          windowMs:
            1000
        }, store),
        {
          allowed:
            true,
          retryAfterSeconds:
            0
        }
      );

      assert.deepEqual(
        await checkRateLimit({
          key,
          limit:
            2,
          windowMs:
            1000
        }, store),
        {
          allowed:
            true,
          retryAfterSeconds:
            0
        }
      );

      assert.deepEqual(
        await checkRateLimit({
          key,
          limit:
            2,
          windowMs:
            1000
        }, store),
        {
          allowed:
            false,
          retryAfterSeconds:
            1
        }
      );

      now =
        2001;

      assert.deepEqual(
        await checkRateLimit({
          key,
          limit:
            2,
          windowMs:
            1000
        }, store),
        {
          allowed:
            true,
          retryAfterSeconds:
            0
        }
      );
    } finally {
      Date.now =
        originalNow;
    }
  }
);
