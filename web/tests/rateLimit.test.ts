import assert from "node:assert/strict";
import test from "node:test";

import {
  checkRateLimit
} from "../src/lib/rateLimit";


test(
  "blocks requests after the configured limit until the window resets",
  () => {
    const originalNow =
      Date.now;

    let now =
      1000;

    Date.now =
      () => now;

    try {
      const key =
        `test:${crypto.randomUUID()}`;

      assert.deepEqual(
        checkRateLimit({
          key,
          limit:
            2,
          windowMs:
            1000
        }),
        {
          allowed:
            true,
          retryAfterSeconds:
            0
        }
      );

      assert.deepEqual(
        checkRateLimit({
          key,
          limit:
            2,
          windowMs:
            1000
        }),
        {
          allowed:
            true,
          retryAfterSeconds:
            0
        }
      );

      assert.deepEqual(
        checkRateLimit({
          key,
          limit:
            2,
          windowMs:
            1000
        }),
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
        checkRateLimit({
          key,
          limit:
            2,
          windowMs:
            1000
        }),
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
