export type UsageActivitySession = {
  id: string;
  site: string;
  type: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
};


export type UsageActivitySegment = {
  id: string;
  site: string;
  type: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  sessionCount: number;
};


type GroupContinuousUsageSessionsOptions = {
  minimumSegmentDurationSeconds?: number;
};


const CONTINUOUS_SESSION_GAP_MS =
  3 * 60 * 1000;


export const MINIMUM_VISIBLE_ACTIVITY_SEGMENT_SECONDS =
  3 * 60;


export function countShortActiveUsageSessions(
  sessions: UsageActivitySession[],
  minimumDurationSeconds =
    MINIMUM_VISIBLE_ACTIVITY_SEGMENT_SECONDS
) {
  return sessions.filter(
    (session) =>
      session.type ===
        "active" &&
      session.durationSeconds <
        minimumDurationSeconds
  ).length;
}


function canBridgeAcrossShortSession(
  sessions: UsageActivitySession[],
  startIndex: number,
  previousSegment: UsageActivitySegment,
  minimumSegmentDurationSeconds: number
) {
  for (
    let index =
      startIndex;
    index <
      sessions.length;
    index +=
      1
  ) {
    const candidate =
      sessions[
        index
      ];

    const gapFromPreviousSegment =
      candidate.startTime.getTime() -
      previousSegment.endTime.getTime();

    if (
      gapFromPreviousSegment >
      CONTINUOUS_SESSION_GAP_MS
    ) {
      return false;
    }

    if (
      candidate.site ===
        previousSegment.site &&
      candidate.type ===
        previousSegment.type
    ) {
      return true;
    }

    if (
      candidate.durationSeconds >=
      minimumSegmentDurationSeconds
    ) {
      return false;
    }
  }

  return false;
}


function mergeSegment(
  segment: UsageActivitySegment,
  session: UsageActivitySession
) {
  segment.endTime =
    session.endTime;

  segment.durationSeconds +=
    session.durationSeconds;

  segment.sessionCount +=
    1;
}


export function groupContinuousUsageSessions(
  sessions: UsageActivitySession[],
  options:
    GroupContinuousUsageSessionsOptions = {}
) {
  const minimumSegmentDurationSeconds =
    options.minimumSegmentDurationSeconds ??
    0;

  const sortedSessions =
    [...sessions].sort(
      (
        first,
        second
      ) =>
        first.startTime.getTime() -
        second.startTime.getTime()
    );

  const segments:
    UsageActivitySegment[] = [];

  for (
    let index =
      0;
    index <
      sortedSessions.length;
    index +=
      1
  ) {
    const session =
      sortedSessions[
        index
      ];

    const previousSegment =
      segments[
        segments.length - 1
      ];

    const isContinuous =
      previousSegment &&
      previousSegment.site ===
        session.site &&
      previousSegment.type ===
        session.type &&
      session.startTime.getTime() -
        previousSegment.endTime.getTime() <=
        CONTINUOUS_SESSION_GAP_MS;

    if (
      isContinuous
    ) {
      mergeSegment(
        previousSegment,
        session
      );

      continue;
    }

    const isShortInterruption =
      minimumSegmentDurationSeconds >
        0 &&
      previousSegment &&
      session.durationSeconds <
        minimumSegmentDurationSeconds &&
      canBridgeAcrossShortSession(
        sortedSessions,
        index +
          1,
        previousSegment,
        minimumSegmentDurationSeconds
      );

    if (
      isShortInterruption
    ) {
      continue;
    }

    segments.push({
      id:
        session.id,

      site:
        session.site,

      type:
        session.type,

      startTime:
        session.startTime,

      endTime:
        session.endTime,

      durationSeconds:
        session.durationSeconds,

      sessionCount:
        1
    });
  }

  return segments
    .filter(
      (segment) =>
        segment.durationSeconds >=
        minimumSegmentDurationSeconds
    )
    .reverse();
}
