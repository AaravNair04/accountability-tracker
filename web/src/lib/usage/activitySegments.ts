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


const CONTINUOUS_SESSION_GAP_MS =
  1000;


export function groupContinuousUsageSessions(
  sessions: UsageActivitySession[]
) {
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
    const session
    of sortedSessions
  ) {
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
      previousSegment.endTime =
        session.endTime;

      previousSegment.durationSeconds +=
        session.durationSeconds;

      previousSegment.sessionCount +=
        1;

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

  return segments.reverse();
}
