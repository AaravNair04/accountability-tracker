import { prisma } from "@/lib/prisma";

import {
  calendarDateToDatabaseDate,
  getDayStartUtc,
  getNextDayStartUtc,
  isValidTimeZone
} from "@/lib/reports/reportTime";

import type {
  CalendarDate
} from "@/lib/reports/reportTime";


const UNKNOWN_GAP_MINUTES = 15;

type CoverageType =
  | "GOOD"
  | "LIMITED"
  | "PAUSED"
  | "UNKNOWN";

export async function generateDailyReport(
  userId: string,
  reportDate: CalendarDate
) {

  // --------------------------------------------------
  // LOAD REPORT OWNER
  // --------------------------------------------------

  const reportOwner =
    await prisma.user.findUnique({

      where: {
        id: userId
      },

      select: {
        timezone: true
      }

    });


  if (!reportOwner) {

    throw new Error(
      "Report owner not found."
    );

  }


  const timeZone =
    reportOwner.timezone;


  // Make sure the stored timezone is valid.
  if (
    !isValidTimeZone(
      timeZone
    )
  ) {

    throw new Error(
      `Invalid user timezone: ${timeZone}`
    );

  }


  // --------------------------------------------------
  // DAY BOUNDARIES
  // --------------------------------------------------

  /*
    reportDate is a logical calendar date.

    Example:

    reportDate:
    2026-09-05

    timezone:
    Asia/Kolkata

    dayStart becomes:
    2026-09-04T18:30:00.000Z

    dayEnd becomes:
    2026-09-05T18:30:00.000Z
  */

  const dayStart =
    getDayStartUtc(
      reportDate,
      timeZone
    );


  const dayEnd =
    getNextDayStartUtc(
      reportDate,
      timeZone
    );


  /*
    If we manually generate today's report,
    do not count the future part of today
    as UNKNOWN.

    Completed historical days still use
    the full dayEnd.
  */

  const now =
    new Date();


  let coverageEnd =
    dayEnd;


  if (
    now.getTime() >=
      dayStart.getTime() &&
    now.getTime() <
      dayEnd.getTime()
  ) {

    coverageEnd =
      now;

  }


  /*
    Prevent a future report from accidentally
    generating a full UNKNOWN day.
  */

  if (
    now.getTime() <
    dayStart.getTime()
  ) {

    coverageEnd =
      dayStart;

  }


  /*
    PostgreSQL DATE representation.

    This stores the logical report date:

    2026-09-05

    rather than the UTC instant representing
    midnight in the user's timezone.
  */

  const databaseReportDate =
    calendarDateToDatabaseDate(
      reportDate
    );


    // --------------------------------------------------
  // LOAD USAGE SESSIONS
  // --------------------------------------------------

  /*
    Load every session that overlaps the
    portion of this report day being evaluated.

    Example:

    Report day:
    12:00 AM → 12:00 AM

    Session:
    11:58 PM → 12:04 AM

    The session overlaps both days, so each
    report must count only its own portion.
  */

  const sessions =
    await prisma.usageSession.findMany({

      where: {

        userId,

        // Session began before this report period ended.
        startTime: {
          lt:
            coverageEnd
        },

        // Session ended after this report period began.
        endTime: {
          gt:
            dayStart
        }

      }

    });


  // --------------------------------------------------
  // CLIP SESSIONS TO REPORT BOUNDARIES
  // --------------------------------------------------

  /*
    Never use the full stored duration for an
    overlapping session.

    Instead:

    effectiveStart =
      max(session start, report start)

    effectiveEnd =
      min(session end, report end)
  */

  const clippedSessions =
    sessions
      .map(
        (session) => {

          const effectiveStart =
            Math.max(
              session
                .startTime
                .getTime(),

              dayStart
                .getTime()
            );


          const effectiveEnd =
            Math.min(
              session
                .endTime
                .getTime(),

              coverageEnd
                .getTime()
            );


          const durationSeconds =
            Math.max(
              0,

              Math.floor(
                (
                  effectiveEnd -
                  effectiveStart
                ) /
                1000
              )
            );


          return {
            site:
              session.site,

            type:
              session.type,

            durationSeconds
          };

        }
      )
      .filter(
        (session) =>
          session.durationSeconds >
          0
      );


  // --------------------------------------------------
  // USAGE TOTALS
  // --------------------------------------------------

  const totalSeconds =
    clippedSessions.reduce(
      (
        total,
        session
      ) =>
        total +
        session.durationSeconds,
      0
    );


  const activeSeconds =
    clippedSessions
      .filter(
        (session) =>
          session.type ===
          "active"
      )
      .reduce(
        (
          total,
          session
        ) =>
          total +
          session.durationSeconds,
        0
      );


  const backgroundAudioSeconds =
    clippedSessions
      .filter(
        (session) =>
          session.type ===
          "background_audio"
      )
      .reduce(
        (
          total,
          session
        ) =>
          total +
          session.durationSeconds,
        0
      );


  // --------------------------------------------------
  // SITE TOTALS
  // --------------------------------------------------

  const siteUsage:
    Record<string, number> = {};


  for (
    const session
    of clippedSessions
  ) {

    siteUsage[
      session.site
    ] =
      (
        siteUsage[
          session.site
        ] ?? 0
      ) +
      session.durationSeconds;

  }


  // --------------------------------------------------
  // LOAD USER DEVICES
  // --------------------------------------------------

  const devices =
  await prisma.device.findMany({

    where: {

      userId,

      // Device must have existed before the
      // evaluated part of this report ended.
      createdAt: {
        lt:
          coverageEnd
      },

      // Device must not have been revoked
      // before this report day began.
      OR: [
        {
          revokedAt:
            null
        },
        {
          revokedAt: {
            gt:
              dayStart
          }
        }
      ]

    }

  });


  /*
    V1:

    We currently calculate tracking
    integrity using the user's most
    recently seen extension device.

    Multi-device integrity aggregation
    can be added later.
  */

  // searchthis


    // --------------------------------------------------
  // MULTI-DEVICE TRACKING COVERAGE
  // --------------------------------------------------

  type CoverageSegment = {
    start: Date;
    end: Date;
    type: CoverageType;
  };


  const deviceCoverageSegments:
    CoverageSegment[] = [];


  /*
    Each device contributes coverage only while
    that device was valid during this report period.

    Example:

    Device A:
    09:00 -> 13:00

    Device B:
    13:10 -> 23:00

    13:00 -> 13:10 remains UNKNOWN.
  */

  for (
    const device
    of devices
  ) {

    const deviceStart =
      new Date(
        Math.max(
          device.createdAt.getTime(),
          dayStart.getTime()
        )
      );


    const deviceEnd =
      new Date(
        Math.min(
          device.revokedAt
            ?.getTime() ??
            coverageEnd.getTime(),

          coverageEnd.getTime()
        )
      );


    // Device was not valid during this period.
    if (
      deviceEnd.getTime() <=
      deviceStart.getTime()
    ) {
      continue;
    }


    // ------------------------------------------------
    // LOAD DEVICE EVENTS
    // ------------------------------------------------

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
      Pause state may have started before
      this device's report interval.
    */

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
    // BUILD PAUSE INTERVALS
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

        if (pauseStart) {

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


    // Pause continued until device interval ended.
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
    // BUILD HEARTBEAT COVERAGE
    // ------------------------------------------------

    const heartbeatCoverage:
      CoverageSegment[] = [];


    if (
      heartbeatEvents.length ===
      0
    ) {

      heartbeatCoverage.push({
        start:
          deviceStart,

        end:
          deviceEnd,

        type:
          "UNKNOWN"
      });

    } else {

      // Device start -> first heartbeat.
      if (
        heartbeatEvents[0]
          .createdAt
          .getTime() >
        deviceStart.getTime()
      ) {

        heartbeatCoverage.push({
          start:
            deviceStart,

          end:
            heartbeatEvents[0]
              .createdAt,

          type:
            "UNKNOWN"
        });

      }


      // Between heartbeats.
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


        const gapMinutes =
          (
            next
              .createdAt
              .getTime() -
            current
              .createdAt
              .getTime()
          ) /
          (
            1000 *
            60
          );


        const coverageType:
          CoverageType =
            gapMinutes >
              UNKNOWN_GAP_MINUTES
              ? "UNKNOWN"
              : current
                  .incognitoEnabled
                ? "GOOD"
                : "LIMITED";


        heartbeatCoverage.push({
          start:
            current.createdAt,

          end:
            next.createdAt,

          type:
            coverageType
        });

      }


      // Last heartbeat -> device interval end.
      // Last heartbeat → end of device interval.
      const lastHeartbeat =
        heartbeatEvents[
          heartbeatEvents.length - 1
        ];

      if (
        deviceEnd.getTime() >
        lastHeartbeat.createdAt.getTime()
      ) {

        const finalGapMinutes =
          (
            deviceEnd.getTime() -
            lastHeartbeat.createdAt.getTime()
          ) /
          (
            1000 *
            60
          );


        /*
          If this device was revoked, we cannot assume
          tracking remained healthy after its final
          heartbeat.

          An active device still receives the normal
          heartbeat grace period.
        */
        const finalCoverageType:
          CoverageType =
            device.revokedAt
              ? "UNKNOWN"
              : finalGapMinutes >
                  UNKNOWN_GAP_MINUTES
                ? "UNKNOWN"
                : lastHeartbeat
                    .incognitoEnabled
                  ? "GOOD"
                  : "LIMITED";


        heartbeatCoverage.push({
          start:
            lastHeartbeat.createdAt,

          end:
            deviceEnd,

          type:
            finalCoverageType
        });

      }

    }


    // ------------------------------------------------
    // APPLY PAUSES TO THIS DEVICE
    // ------------------------------------------------

    /*
      Build every boundary where this device's
      state can change.

      This lets pause intervals override heartbeat
      status without double-counting time.
    */

    const boundaryTimes =
      new Set<number>();


    boundaryTimes.add(
      deviceStart.getTime()
    );

    boundaryTimes.add(
      deviceEnd.getTime()
    );


    for (
      const segment
      of heartbeatCoverage
    ) {

      boundaryTimes.add(
        segment.start.getTime()
      );

      boundaryTimes.add(
        segment.end.getTime()
      );

    }


    for (
      const interval
      of pauseIntervals
    ) {

      boundaryTimes.add(
        interval.start.getTime()
      );

      boundaryTimes.add(
        interval.end.getTime()
      );

    }


    const boundaries =
      Array.from(
        boundaryTimes
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
        boundaries.length - 1;
      index++
    ) {

      const segmentStart =
        new Date(
          boundaries[index]
        );


      const segmentEnd =
        new Date(
          boundaries[
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


      if (isPaused) {

        deviceCoverageSegments.push({
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


      deviceCoverageSegments.push({

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
  // COMBINE ALL DEVICES
  // --------------------------------------------------

  /*
    Different devices can overlap.

    Example:

    Device A = GOOD
    Device B = UNKNOWN

    The user is still provably tracked because
    Device A is healthy.

    Priority:

    GOOD
    LIMITED
    PAUSED
    UNKNOWN
  */

  const globalBoundaryTimes =
    new Set<number>();


  globalBoundaryTimes.add(
    dayStart.getTime()
  );

  globalBoundaryTimes.add(
    coverageEnd.getTime()
  );


  for (
    const segment
    of deviceCoverageSegments
  ) {

    globalBoundaryTimes.add(
      segment.start.getTime()
    );

    globalBoundaryTimes.add(
      segment.end.getTime()
    );

  }


  const globalBoundaries =
    Array.from(
      globalBoundaryTimes
    ).sort(
      (
        first,
        second
      ) =>
        first -
        second
    );


  let goodSeconds = 0;

  let limitedSeconds = 0;

  let pausedSeconds = 0;

  let unknownSeconds = 0;


  for (
    let index = 0;
    index <
      globalBoundaries.length - 1;
    index++
  ) {

    const segmentStart =
      new Date(
        globalBoundaries[
          index
        ]
      );


    const segmentEnd =
      new Date(
        globalBoundaries[
          index + 1
        ]
      );


    const durationSeconds =
      Math.max(
        0,

        Math.floor(
          (
            segmentEnd.getTime() -
            segmentStart.getTime()
          ) /
          1000
        )
      );


    if (
      durationSeconds ===
      0
    ) {
      continue;
    }


    const activeTypes =
      deviceCoverageSegments
        .filter(
          (segment) =>
            segment.start.getTime() <
              segmentEnd.getTime() &&
            segment.end.getTime() >
              segmentStart.getTime()
        )
        .map(
          (segment) =>
            segment.type
        );


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


    if (
      finalType ===
      "GOOD"
    ) {

      goodSeconds +=
        durationSeconds;

    } else if (
      finalType ===
      "LIMITED"
    ) {

      limitedSeconds +=
        durationSeconds;

    } else if (
      finalType ===
      "PAUSED"
    ) {

      pausedSeconds +=
        durationSeconds;

    } else {

      unknownSeconds +=
        durationSeconds;

    }

  }


  // --------------------------------------------------
  // SAVE REPORT
  // --------------------------------------------------

  /*
    The report date is now a logical
    PostgreSQL DATE.

    Example:

    reportDate:
    2026-09-05

    timezone:
    Asia/Kolkata

    The raw tracking data is still queried
    using the correct UTC boundaries.
  */


  /*
    upsert keeps report generation
    idempotent.

    Running this twice for the same
    user and logical date updates the same
    report instead of creating duplicates.
  */

  const report =
    await prisma.dailyReport.upsert({

      where: {

        userId_reportDate: {

          userId,

          reportDate:
            databaseReportDate

        }

      },


      update: {

        timezone:
          timeZone,

        totalSeconds,
        activeSeconds,
        backgroundAudioSeconds,

        goodSeconds,
        limitedSeconds,
        pausedSeconds,
        unknownSeconds,

        siteUsage

      },


      create: {

        userId,

        reportDate:
          databaseReportDate,

        timezone:
          timeZone,

        totalSeconds,
        activeSeconds,
        backgroundAudioSeconds,

        goodSeconds,
        limitedSeconds,
        pausedSeconds,
        unknownSeconds,

        siteUsage

      }

    });

  // Find accepted accountability peers.
const acceptedPeers =
  await prisma.trustedPeer.findMany({

    where: {
      ownerId:
        userId,

      status:
        "accepted"
    },

    select: {
      peerId:
        true
    }

  });


// Create one delivery per accepted peer.
for (
  const relationship
  of acceptedPeers
) {

  await prisma.reportDelivery.upsert({

    where: {
      reportId_peerId: {
        reportId:
          report.id,

        peerId:
          relationship.peerId
      }
    },

    update: {},

    create: {
      reportId:
        report.id,

      peerId:
        relationship.peerId
    }

  });

}
  return report;
}