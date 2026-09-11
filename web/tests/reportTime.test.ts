import assert from "node:assert/strict";
import test from "node:test";

import {
  addCalendarDays,
  formatReportDateKey,
  getDayStartUtc,
  getNextDayStartUtc,
  isValidTimeZone
} from "../src/lib/reports/reportTime";


test(
  "validates IANA timezones",
  () => {
    assert.equal(
      isValidTimeZone(
        "Asia/Kolkata"
      ),
      true
    );

    assert.equal(
      isValidTimeZone(
        "Not/AZone"
      ),
      false
    );
  }
);


test(
  "formats and shifts calendar dates",
  () => {
    assert.equal(
      formatReportDateKey({
        year:
          2026,
        month:
          9,
        day:
          5
      }),
      "2026-09-05"
    );

    assert.deepEqual(
      addCalendarDays(
        {
          year:
            2026,
          month:
            3,
          day:
            1
        },
        -1
      ),
      {
        year:
          2026,
        month:
          2,
        day:
          28
      }
    );
  }
);


test(
  "calculates UTC day boundaries for a timezone",
  () => {
    const date =
      {
        year:
          2026,
        month:
          9,
        day:
          11
      };

    assert.equal(
      getDayStartUtc(
        date,
        "UTC"
      ).toISOString(),
      "2026-09-11T00:00:00.000Z"
    );

    assert.equal(
      getNextDayStartUtc(
        date,
        "UTC"
      ).toISOString(),
      "2026-09-12T00:00:00.000Z"
    );

    assert.equal(
      getDayStartUtc(
        date,
        "Asia/Kolkata"
      ).toISOString(),
      "2026-09-10T18:30:00.000Z"
    );
  }
);
