import {
  prisma
} from "@/lib/prisma";

import {
  calendarDateToDatabaseDate,
  getDayStartUtc,
  getNextDayStartUtc,
  isValidTimeZone
} from "@/lib/reports/reportTime";

import {
  calculateTrackingCoverage
} from "@/lib/reports/trackingCoverage";

import type {
  CalendarDate
} from "@/lib/reports/reportTime";


type GenerateDailyReportOptions = {
  deliverToPeers?:
    boolean;
};


export async function generateDailyReport(
  userId: string,
  reportDate: CalendarDate,
  options:
    GenerateDailyReportOptions = {}
) {
  const reportOwner =
    await prisma.user.findUnique({
      where: {
        id:
          userId
      },

      select: {
        timezone:
          true
      }
    });

  if (
    !reportOwner
  ) {
    throw new Error(
      "Report owner not found."
    );
  }

  const timeZone =
    reportOwner.timezone;

  if (
    !isValidTimeZone(
      timeZone
    )
  ) {
    throw new Error(
      `Invalid user timezone: ${timeZone}`
    );
  }

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

  if (
    now.getTime() <
    dayStart.getTime()
  ) {
    coverageEnd =
      dayStart;
  }

  const databaseReportDate =
    calendarDateToDatabaseDate(
      reportDate
    );


  // --------------------------------------------------
  // USAGE
  // --------------------------------------------------

  const sessions =
    await prisma.usageSession.findMany({
      where: {
        userId,

        startTime: {
          lt:
            coverageEnd
        },

        endTime: {
          gt:
            dayStart
        }
      }
    });

  const clippedSessions =
    sessions
      .map(
        (session) => {
          const effectiveStart =
            Math.max(
              session.startTime.getTime(),
              dayStart.getTime()
            );

          const effectiveEnd =
            Math.min(
              session.endTime.getTime(),
              coverageEnd.getTime()
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
  // TRACKING INTEGRITY
  // --------------------------------------------------

  const coverage =
    await calculateTrackingCoverage(
      userId,
      dayStart,
      coverageEnd
    );


  // --------------------------------------------------
  // SAVE REPORT
  // --------------------------------------------------

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

        goodSeconds:
          coverage.goodSeconds,

        limitedSeconds:
          coverage.limitedSeconds,

        pausedSeconds:
          coverage.pausedSeconds,

        unknownSeconds:
          coverage.unknownSeconds,

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

        goodSeconds:
          coverage.goodSeconds,

        limitedSeconds:
          coverage.limitedSeconds,

        pausedSeconds:
          coverage.pausedSeconds,

        unknownSeconds:
          coverage.unknownSeconds,

        siteUsage
      }
    });


  // --------------------------------------------------
  // DELIVER ONLY FINAL / COMPLETED REPORTS
  // --------------------------------------------------

  if (
    options.deliverToPeers ===
    true
  ) {
    const acceptedPeers =
      await prisma.trustedPeer.findMany({
        where: {
          ownerId:
            userId,

          status:
            "accepted",

          revokedAt:
            null
        },

        select: {
          peerId:
            true
        }
      });

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
  }

  return report;
}
