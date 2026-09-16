import assert from "node:assert/strict";
import test from "node:test";

import {
  canRespondToPeerInvitation,
  canSubmitReportResponse,
  resolvePermittedSourceDeviceId
} from "../src/lib/security/accessControl";


test(
  "only the invited pending peer can respond to an invitation",
  () => {
    assert.equal(
      canRespondToPeerInvitation({
        userId:
          "peer-1",

        invitation: {
          peerId:
            "peer-1",

          status:
            "pending",

          revokedAt:
            null
        }
      }),
      true
    );

    assert.equal(
      canRespondToPeerInvitation({
        userId:
          "owner-1",

        invitation: {
          peerId:
            "peer-1",

          status:
            "pending",

          revokedAt:
            null
        }
      }),
      false
    );

    assert.equal(
      canRespondToPeerInvitation({
        userId:
          "peer-1",

        invitation: {
          peerId:
            "peer-1",

          status:
            "accepted",

          revokedAt:
            null
        }
      }),
      false
    );
  }
);


test(
  "only accepted delivered peers can respond to reports",
  () => {
    assert.equal(
      canSubmitReportResponse({
        userId:
          "peer-1",

        report: {
          userId:
            "owner-1"
        },

        relationship: {
          status:
            "accepted",

          revokedAt:
            null
        },

        delivery: {
          id:
            "delivery-1"
        }
      }),
      true
    );

    assert.equal(
      canSubmitReportResponse({
        userId:
          "owner-1",

        report: {
          userId:
            "owner-1"
        },

        relationship: {
          status:
            "accepted",

          revokedAt:
            null
        },

        delivery: {
          id:
            "delivery-1"
        }
      }),
      false
    );

    assert.equal(
      canSubmitReportResponse({
        userId:
          "peer-1",

        report: {
          userId:
            "owner-1"
        },

        relationship: {
          status:
            "pending",

          revokedAt:
            null
        },

        delivery: {
          id:
            "delivery-1"
        }
      }),
      false
    );

    assert.equal(
      canSubmitReportResponse({
        userId:
          "peer-1",

        report: {
          userId:
            "owner-1"
        },

        relationship: {
          status:
            "accepted",

          revokedAt:
            null
        },

        delivery:
          null
      }),
      false
    );
  }
);


test(
  "queued extension sessions can only use source devices from the same user",
  () => {
    assert.equal(
      resolvePermittedSourceDeviceId({
        authenticatedUserId:
          "user-1",

        authenticatedDeviceId:
          "device-current",

        requestedSourceDevice:
          null
      }),
      "device-current"
    );

    assert.equal(
      resolvePermittedSourceDeviceId({
        authenticatedUserId:
          "user-1",

        authenticatedDeviceId:
          "device-current",

        requestedSourceDevice: {
          id:
            "device-old",

          userId:
            "user-1"
        }
      }),
      "device-old"
    );

    assert.equal(
      resolvePermittedSourceDeviceId({
        authenticatedUserId:
          "user-1",

        authenticatedDeviceId:
          "device-current",

        requestedSourceDevice: {
          id:
            "device-other",

          userId:
            "user-2"
        }
      }),
      null
    );
  }
);
