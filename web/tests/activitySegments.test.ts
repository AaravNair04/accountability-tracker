import assert from "node:assert/strict";
import test from "node:test";

import {
  groupContinuousUsageSessions
} from "../src/lib/usage/activitySegments";


function session(
  id: string,
  site: string,
  type: string,
  start: string,
  end: string
) {
  const startTime =
    new Date(
      start
    );

  const endTime =
    new Date(
      end
    );

  return {
    id,
    site,
    type,
    startTime,
    endTime,
    durationSeconds:
      Math.floor(
        (
          endTime.getTime() -
          startTime.getTime()
        ) /
        1000
      )
  };
}


test(
  "groups same site and type within a five minute gap",
  () => {
    const segments =
      groupContinuousUsageSessions([
        session(
          "a",
          "youtube",
          "active",
          "2026-09-11T10:00:00.000Z",
          "2026-09-11T10:05:00.000Z"
        ),
        session(
          "b",
          "youtube",
          "active",
          "2026-09-11T10:09:00.000Z",
          "2026-09-11T10:10:00.000Z"
        )
      ]);

    assert.equal(
      segments.length,
      1
    );

    assert.equal(
      segments[0].sessionCount,
      2
    );

    assert.equal(
      segments[0].durationSeconds,
      360
    );
  }
);


test(
  "does not group different types or large gaps",
  () => {
    const segments =
      groupContinuousUsageSessions([
        session(
          "a",
          "youtube",
          "active",
          "2026-09-11T10:00:00.000Z",
          "2026-09-11T10:01:00.000Z"
        ),
        session(
          "b",
          "youtube",
          "background_audio",
          "2026-09-11T10:02:00.000Z",
          "2026-09-11T10:03:00.000Z"
        ),
        session(
          "c",
          "youtube",
          "active",
          "2026-09-11T10:10:01.000Z",
          "2026-09-11T10:11:01.000Z"
        )
      ]);

    assert.equal(
      segments.length,
      3
    );
  }
);


test(
  "returns newest segments first",
  () => {
    const segments =
      groupContinuousUsageSessions([
        session(
          "old",
          "youtube",
          "active",
          "2026-09-11T08:00:00.000Z",
          "2026-09-11T08:01:00.000Z"
        ),
        session(
          "new",
          "twitch_tv",
          "active",
          "2026-09-11T12:00:00.000Z",
          "2026-09-11T12:01:00.000Z"
        )
      ]);

    assert.equal(
      segments[0].id,
      "new"
    );
  }
);
