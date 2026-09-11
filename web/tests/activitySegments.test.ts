import assert from "node:assert/strict";
import test from "node:test";

import {
  countShortActiveUsageSessions,
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
  "counts only grouped active segments under the visible duration threshold",
  () => {
    const count =
      countShortActiveUsageSessions([
        session(
          "a",
          "youtube",
          "active",
          "2026-09-11T10:00:00.000Z",
          "2026-09-11T10:02:59.000Z"
        ),
        session(
          "b",
          "youtube",
          "active",
          "2026-09-11T10:03:00.000Z",
          "2026-09-11T10:06:00.000Z"
        ),
        session(
          "c",
          "youtube",
          "background_audio",
          "2026-09-11T10:07:00.000Z",
          "2026-09-11T10:08:00.000Z"
        ),
        session(
          "d",
          "twitch_tv",
          "active",
          "2026-09-11T10:09:00.000Z",
          "2026-09-11T10:10:00.000Z"
        )
      ]);

    assert.equal(
      count,
      1
    );
  }
);


test(
  "does not count short active bursts that group into a longer segment",
  () => {
    const count =
      countShortActiveUsageSessions([
        session(
          "a",
          "youtube",
          "active",
          "2026-09-11T10:00:00.000Z",
          "2026-09-11T10:02:00.000Z"
        ),
        session(
          "b",
          "youtube",
          "background_audio",
          "2026-09-11T10:02:10.000Z",
          "2026-09-11T10:02:30.000Z"
        ),
        session(
          "c",
          "youtube",
          "active",
          "2026-09-11T10:02:40.000Z",
          "2026-09-11T10:04:40.000Z"
        )
      ]);

    assert.equal(
      count,
      0
    );
  }
);


test(
  "groups same site and type within a three minute gap",
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
          "2026-09-11T10:08:00.000Z",
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
      420
    );
  }
);


test(
  "does not group different types or gaps over three minutes",
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
          "2026-09-11T10:06:01.000Z",
          "2026-09-11T10:07:01.000Z"
        )
      ]);

    assert.equal(
      segments.length,
      3
    );
  }
);


test(
  "bridges short interruptions before applying the visible duration threshold",
  () => {
    const segments =
      groupContinuousUsageSessions(
        [
          session(
            "a",
            "youtube",
            "active",
            "2026-09-11T10:00:00.000Z",
            "2026-09-11T10:04:00.000Z"
          ),
          session(
            "b",
            "youtube",
            "background_audio",
            "2026-09-11T10:04:20.000Z",
            "2026-09-11T10:05:20.000Z"
          ),
          session(
            "c",
            "youtube",
            "active",
            "2026-09-11T10:06:00.000Z",
            "2026-09-11T10:10:00.000Z"
          )
        ],
        {
          minimumSegmentDurationSeconds:
            3 * 60
        }
      );

    assert.equal(
      segments.length,
      1
    );

    assert.equal(
      segments[0].type,
      "active"
    );

    assert.equal(
      segments[0].sessionCount,
      2
    );

    assert.equal(
      segments[0].durationSeconds,
      8 * 60
    );
  }
);


test(
  "hides grouped segments under the visible duration threshold",
  () => {
    const segments =
      groupContinuousUsageSessions(
        [
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
            "active",
            "2026-09-11T10:02:00.000Z",
            "2026-09-11T10:03:00.000Z"
          )
        ],
        {
          minimumSegmentDurationSeconds:
            3 * 60
        }
      );

    assert.equal(
      segments.length,
      0
    );
  }
);


test(
  "keeps long different-type segments from being bridged",
  () => {
    const segments =
      groupContinuousUsageSessions(
        [
          session(
            "a",
            "youtube",
            "active",
            "2026-09-11T10:00:00.000Z",
            "2026-09-11T10:04:00.000Z"
          ),
          session(
            "b",
            "youtube",
            "background_audio",
            "2026-09-11T10:04:30.000Z",
            "2026-09-11T10:08:30.000Z"
          ),
          session(
            "c",
            "youtube",
            "active",
            "2026-09-11T10:09:00.000Z",
            "2026-09-11T10:13:00.000Z"
          )
        ],
        {
          minimumSegmentDurationSeconds:
            3 * 60
        }
      );

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
