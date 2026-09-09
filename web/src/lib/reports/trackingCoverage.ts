import {
  prisma
} from "@/lib/prisma";


const UNKNOWN_GAP_MINUTES =
  15;

const UNKNOWN_GAP_MS =
  UNKNOWN_GAP_MINUTES *
  60 *
  1000;


export type CoverageType =
  | "GOOD"
  | "LIMITED"
  | "PAUSED"
  | "UNKNOWN";


type CoverageSegment = {
  start: Date;
  end: Date;
  type: CoverageType;
};


export type TrackingCoverage = {
  goodSeconds: number;
  limitedSeconds: number;
  pausedSeconds: number;
  unknownSeconds: number;
};


export type CurrentTrackingStatus = {
  status:
    CoverageType;

  device: {
    id: string;
    name: string;
    lastSeenAt: Date | null;
    incognitoEnabled: boolean | null;
  } | null;
};


// --------------------------------------------------
// COVERAGE FOR A PERIOD
// --------------------------------------------------

export async function calculateTrackingCoverage(
  userId: string,
  start: Date,
  end: Date
): Promise<TrackingCoverage> {
  if (
    end.getTime() <=
    start.getTime()
  ) {
    return {
      goodSeconds:
        0,

      limitedSeconds:
        0,

      pausedSeconds:
        0,

      unknownSeconds:
        0
    };
  }

  /*
    Only confirmed devices count as real trackers.

    This prevents an abandoned link attempt from
    creating fake UNKNOWN coverage.
  */
  const devices =
    await prisma.device.findMany({
      where: {
        userId,

        confirmedAt: {
          not:
            null
        },

        createdAt: {
          lt:
            end
        },

        OR: [
          {
            revokedAt:
              null
          },
          {
            revokedAt: {
              gt:
                start
            }
          }
        ]
      },

      select: {
        id:
          true,

        createdAt:
          true,

        confirmedAt:
          true,

        revokedAt:
          true
      }
    });

  const deviceSegments:
    CoverageSegment[] = [];

  for (
    const device
    of devices
  ) {
    if (
      !device.confirmedAt
    ) {
      continue;
    }

    /*
      Device validity begins at successful confirmation,
      not when the temporary DB row was first created.
    */
    const deviceStart =
      new Date(
        Math.max(
          start.getTime(),
          device.confirmedAt.getTime()
        )
      );

    const deviceEnd =
      new Date(
        Math.min(
          end.getTime(),
          device.revokedAt
            ?.getTime() ??
            end.getTime()
        )
      );

    if (
      deviceEnd.getTime() <=
      deviceStart.getTime()
    ) {
      continue;
    }

    const trackingEvents =
      await prisma.trackingEvent.findMany({
        where: {
          deviceId:
            device.id,

          createdAt: {
            gte:
              deviceStart,

            lt:
              deviceEnd
          }
        },

        orderBy: {
          createdAt:
            "asc"
        }
      });

    /*
      Carry heartbeat evidence across a day boundary.
      Without this, every midnight would incorrectly
      begin as UNKNOWN until the next heartbeat.
    */
    const previousHeartbeat =
      await prisma.trackingEvent.findFirst({
        where: {
          deviceId:
            device.id,

          type:
            "heartbeat",

          createdAt: {
            lt:
              deviceStart
          }
        },

        orderBy: {
          createdAt:
            "desc"
        }
      });

    const previousPauseEvent =
      await prisma.trackingEvent.findFirst({
        where: {
          deviceId:
            device.id,

          type: {
            in: [
              "tracking_paused",
              "tracking_resumed"
            ]
          },

          createdAt: {
            lt:
              deviceStart
          }
        },

        orderBy: {
          createdAt:
            "desc"
        }
      });

    const heartbeatEvents =
      trackingEvents.filter(
        (event) =>
          event.type ===
          "heartbeat"
      );

    const pauseEvents =
      trackingEvents.filter(
        (event) =>
          event.type ===
            "tracking_paused" ||
          event.type ===
            "tracking_resumed"
      );


    // ------------------------------------------------
    // PAUSE INTERVALS
    // ------------------------------------------------

    const pauseIntervals: {
      start: Date;
      end: Date;
    }[] = [];

    let paused =
      previousPauseEvent
        ?.type ===
      "tracking_paused";

    let pauseStart:
      Date | null =
        paused
          ? deviceStart
          : null;

    for (
      const event
      of pauseEvents
    ) {
      if (
        event.type ===
          "tracking_paused" &&
        !paused
      ) {
        paused =
          true;

        pauseStart =
          event.createdAt;
      }

      if (
        event.type ===
          "tracking_resumed" &&
        paused
      ) {
        if (
          pauseStart
        ) {
          pauseIntervals.push({
            start:
              pauseStart,

            end:
              event.createdAt
          });
        }

        paused =
          false;

        pauseStart =
          null;
      }
    }

    if (
      paused &&
      pauseStart
    ) {
      pauseIntervals.push({
        start:
          pauseStart,

        end:
          deviceEnd
      });
    }


    // ------------------------------------------------
    // HEARTBEAT COVERAGE
    // ------------------------------------------------

    const heartbeatCoverage:
      CoverageSegment[] = [];

    if (
      heartbeatEvents.length ===
      0
    ) {
      const previousHeartbeatStillFresh =
        previousHeartbeat &&
        (
          deviceEnd.getTime() -
          previousHeartbeat
            .createdAt
            .getTime()
        ) <=
        UNKNOWN_GAP_MS;

      heartbeatCoverage.push({
        start:
          deviceStart,

        end:
          deviceEnd,

        type:
          previousHeartbeatStillFresh
            ? previousHeartbeat
                .incognitoEnabled
              ? "GOOD"
              : "LIMITED"
            : "UNKNOWN"
      });

    } else {
      const firstHeartbeat =
        heartbeatEvents[0];

      if (
        firstHeartbeat
          .createdAt
          .getTime() >
        deviceStart.getTime()
      ) {
        const continuousFromBeforeStart =
          previousHeartbeat &&
          (
            firstHeartbeat
              .createdAt
              .getTime() -
            previousHeartbeat
              .createdAt
              .getTime()
          ) <=
          UNKNOWN_GAP_MS;

        heartbeatCoverage.push({
          start:
            deviceStart,

          end:
            firstHeartbeat
              .createdAt,

          type:
            continuousFromBeforeStart
              ? previousHeartbeat
                  .incognitoEnabled
                ? "GOOD"
                : "LIMITED"
              : "UNKNOWN"
        });
      }

      for (
        let index = 0;
        index <
          heartbeatEvents.length - 1;
        index++
      ) {
        const current =
          heartbeatEvents[
            index
          ];

        const next =
          heartbeatEvents[
            index + 1
          ];

        const gapMs =
          next.createdAt.getTime() -
          current.createdAt.getTime();

        heartbeatCoverage.push({
          start:
            current.createdAt,

          end:
            next.createdAt,

          type:
            gapMs >
              UNKNOWN_GAP_MS
              ? "UNKNOWN"
              : current
                  .incognitoEnabled
                ? "GOOD"
                : "LIMITED"
        });
      }

      const lastHeartbeat =
        heartbeatEvents[
          heartbeatEvents.length - 1
        ];

      if (
        deviceEnd.getTime() >
        lastHeartbeat
          .createdAt
          .getTime()
      ) {
        const finalGapMs =
          deviceEnd.getTime() -
          lastHeartbeat
            .createdAt
            .getTime();

        /*
          Once a device is revoked, do not infer healthy
          tracking between its last heartbeat and revoke.
        */
        const finalType:
          CoverageType =
            device.revokedAt
              ? "UNKNOWN"
              : finalGapMs >
                  UNKNOWN_GAP_MS
                ? "UNKNOWN"
                : lastHeartbeat
                    .incognitoEnabled
                  ? "GOOD"
                  : "LIMITED";

        heartbeatCoverage.push({
          start:
            lastHeartbeat
              .createdAt,

          end:
            deviceEnd,

          type:
            finalType
        });
      }
    }


    // ------------------------------------------------
    // PAUSE OVERRIDES HEARTBEAT STATE
    // ------------------------------------------------

    const boundaries =
      new Set<number>([
        deviceStart.getTime(),
        deviceEnd.getTime()
      ]);

    for (
      const segment
      of heartbeatCoverage
    ) {
      boundaries.add(
        segment.start.getTime()
      );

      boundaries.add(
        segment.end.getTime()
      );
    }

    for (
      const interval
      of pauseIntervals
    ) {
      boundaries.add(
        interval.start.getTime()
      );

      boundaries.add(
        interval.end.getTime()
      );
    }

    const orderedBoundaries =
      Array.from(
        boundaries
      ).sort(
        (
          first,
          second
        ) =>
          first -
          second
      );

    for (
      let index = 0;
      index <
        orderedBoundaries.length - 1;
      index++
    ) {
      const segmentStart =
        new Date(
          orderedBoundaries[
            index
          ]
        );

      const segmentEnd =
        new Date(
          orderedBoundaries[
            index + 1
          ]
        );

      if (
        segmentEnd.getTime() <=
        segmentStart.getTime()
      ) {
        continue;
      }

      const isPaused =
        pauseIntervals.some(
          (interval) =>
            interval.start.getTime() <
              segmentEnd.getTime() &&
            interval.end.getTime() >
              segmentStart.getTime()
        );

      if (
        isPaused
      ) {
        deviceSegments.push({
          start:
            segmentStart,

          end:
            segmentEnd,

          type:
            "PAUSED"
        });

        continue;
      }

      const heartbeatSegment =
        heartbeatCoverage.find(
          (segment) =>
            segment.start.getTime() <=
              segmentStart.getTime() &&
            segment.end.getTime() >=
              segmentEnd.getTime()
        );

      deviceSegments.push({
        start:
          segmentStart,

        end:
          segmentEnd,

        type:
          heartbeatSegment
            ?.type ??
            "UNKNOWN"
      });
    }
  }


  // --------------------------------------------------
  // COMBINE DEVICES
  // --------------------------------------------------

  const globalBoundaries =
    new Set<number>([
      start.getTime(),
      end.getTime()
    ]);

  for (
    const segment
    of deviceSegments
  ) {
    globalBoundaries.add(
      segment.start.getTime()
    );

    globalBoundaries.add(
      segment.end.getTime()
    );
  }

  const orderedGlobalBoundaries =
    Array.from(
      globalBoundaries
    ).sort(
      (
        first,
        second
      ) =>
        first -
        second
    );

  let goodMs =
    0;

  let limitedMs =
    0;

  let pausedMs =
    0;

  let unknownMs =
    0;

  for (
    let index = 0;
    index <
      orderedGlobalBoundaries.length - 1;
    index++
  ) {
    const segmentStart =
      orderedGlobalBoundaries[
        index
      ];

    const segmentEnd =
      orderedGlobalBoundaries[
        index + 1
      ];

    if (
      segmentEnd <=
      segmentStart
    ) {
      continue;
    }

    const activeTypes =
      deviceSegments
        .filter(
          (segment) =>
            segment.start.getTime() <
              segmentEnd &&
            segment.end.getTime() >
              segmentStart
        )
        .map(
          (segment) =>
            segment.type
        );

    /*
      Strongest available tracking evidence wins.
      GOOD > LIMITED > PAUSED > UNKNOWN
    */
    let finalType:
      CoverageType =
        "UNKNOWN";

    if (
      activeTypes.includes(
        "GOOD"
      )
    ) {
      finalType =
        "GOOD";

    } else if (
      activeTypes.includes(
        "LIMITED"
      )
    ) {
      finalType =
        "LIMITED";

    } else if (
      activeTypes.includes(
        "PAUSED"
      )
    ) {
      finalType =
        "PAUSED";
    }

    const durationMs =
      segmentEnd -
      segmentStart;

    if (
      finalType ===
      "GOOD"
    ) {
      goodMs +=
        durationMs;

    } else if (
      finalType ===
      "LIMITED"
    ) {
      limitedMs +=
        durationMs;

    } else if (
      finalType ===
      "PAUSED"
    ) {
      pausedMs +=
        durationMs;

    } else {
      unknownMs +=
        durationMs;
    }
  }

  return {
    goodSeconds:
      Math.floor(
        goodMs /
        1000
      ),

    limitedSeconds:
      Math.floor(
        limitedMs /
        1000
      ),

    pausedSeconds:
      Math.floor(
        pausedMs /
        1000
      ),

    unknownSeconds:
      Math.floor(
        unknownMs /
        1000
      )
  };
}


// --------------------------------------------------
// CURRENT STATUS
// --------------------------------------------------

export async function getCurrentTrackingStatus(
  userId: string,
  now =
    new Date()
): Promise<CurrentTrackingStatus> {
  const device =
    await prisma.device.findFirst({
      where: {
        userId,

        confirmedAt: {
          not:
            null
        },

        revokedAt:
          null
      },

      orderBy: {
        lastSeenAt:
          "desc"
      },

      select: {
        id:
          true,

        name:
          true,

        lastSeenAt:
          true,

        incognitoEnabled:
          true
      }
    });

  if (
    !device
  ) {
    return {
      status:
        "UNKNOWN",

      device:
        null
    };
  }

  const latestPauseEvent =
    await prisma.trackingEvent.findFirst({
      where: {
        deviceId:
          device.id,

        type: {
          in: [
            "tracking_paused",
            "tracking_resumed"
          ]
        },

        createdAt: {
          lte:
            now
        }
      },

      orderBy: {
        createdAt:
          "desc"
      }
    });

  if (
    latestPauseEvent?.type ===
    "tracking_paused"
  ) {
    return {
      status:
        "PAUSED",

      device
    };
  }

  const lastHeartbeat =
    await prisma.trackingEvent.findFirst({
      where: {
        deviceId:
          device.id,

        type:
          "heartbeat",

        createdAt: {
          lte:
            now
        }
      },

      orderBy: {
        createdAt:
          "desc"
      }
    });

  if (
    !lastHeartbeat ||
    (
      now.getTime() -
      lastHeartbeat
        .createdAt
        .getTime()
    ) >
    UNKNOWN_GAP_MS
  ) {
    return {
      status:
        "UNKNOWN",

      device
    };
  }

  return {
    status:
      lastHeartbeat
        .incognitoEnabled
        ? "GOOD"
        : "LIMITED",

    device
  };
}
