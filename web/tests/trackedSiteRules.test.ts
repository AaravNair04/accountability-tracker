import assert from "node:assert/strict";
import test from "node:test";

import {
  isValidHostname,
  normalizeHostname,
  siteKeyFromHostname
} from "../src/lib/trackedSiteRules";


test(
  "normalizes URLs into bare hostnames",
  () => {
    assert.equal(
      normalizeHostname(
        "https://www.Twitch.TV/directory"
      ),
      "twitch.tv"
    );

    assert.equal(
      normalizeHostname(
        "  www.youtube.com/watch?v=1  "
      ),
      "youtube.com"
    );
  }
);


test(
  "creates stable site keys from hostnames",
  () => {
    assert.equal(
      siteKeyFromHostname(
        "twitch.tv"
      ),
      "twitch_tv"
    );

    assert.equal(
      siteKeyFromHostname(
        "sub.example-site.com"
      ),
      "sub_example_site_com"
    );
  }
);


test(
  "validates hostnames conservatively",
  () => {
    assert.equal(
      isValidHostname(
        "twitch.tv"
      ),
      true
    );

    assert.equal(
      isValidHostname(
        "-bad.example"
      ),
      false
    );

    assert.equal(
      isValidHostname(
        "bad..example"
      ),
      false
    );

    assert.equal(
      isValidHostname(
        "localhost"
      ),
      false
    );
  }
);
