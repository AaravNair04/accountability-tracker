import assert from "node:assert/strict";
import test from "node:test";

import {
  isValidRetentionDays
} from "../src/lib/dataRetentionRules";


test(
  "allows configured retention periods and never",
  () => {
    assert.equal(
      isValidRetentionDays(
        null
      ),
      true
    );

    assert.equal(
      isValidRetentionDays(
        30
      ),
      true
    );

    assert.equal(
      isValidRetentionDays(
        365
      ),
      true
    );
  }
);


test(
  "rejects unsupported retention values",
  () => {
    assert.equal(
      isValidRetentionDays(
        undefined
      ),
      false
    );

    assert.equal(
      isValidRetentionDays(
        31
      ),
      false
    );

    assert.equal(
      isValidRetentionDays(
        "30"
      ),
      false
    );
  }
);
