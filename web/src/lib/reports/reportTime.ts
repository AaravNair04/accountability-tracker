export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};


// Validate an IANA timezone.
export function isValidTimeZone(
  timeZone: string
) {

  try {

    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone
      }
    );


    return true;

  } catch {

    return false;

  }

}


// Get the calendar date at an instant in a timezone.
export function getCalendarDateInTimeZone(
  instant: Date,
  timeZone: string
): CalendarDate {

  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,

        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    );


  const parts =
    formatter.formatToParts(
      instant
    );


  const getPart =
    (type: string) =>
      Number(
        parts.find(
          (part) =>
            part.type === type
        )?.value
      );


  return {
    year:
      getPart("year"),

    month:
      getPart("month"),

    day:
      getPart("day")
  };

}


// Move a calendar date forward/backward.
export function addCalendarDays(
  date: CalendarDate,
  days: number
): CalendarDate {

  const temporary =
    new Date(
      Date.UTC(
        date.year,
        date.month - 1,
        date.day + days
      )
    );


  return {
    year:
      temporary.getUTCFullYear(),

    month:
      temporary.getUTCMonth() + 1,

    day:
      temporary.getUTCDate()
  };

}


// Get the UTC offset of a timezone at an instant.
function getTimeZoneOffsetMilliseconds(
  instant: Date,
  timeZone: string
) {

  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,

        year: "numeric",
        month: "2-digit",
        day: "2-digit",

        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",

        hourCycle: "h23"
      }
    );


  const parts =
    formatter.formatToParts(
      instant
    );


  const getPart =
    (type: string) =>
      Number(
        parts.find(
          (part) =>
            part.type === type
        )?.value
      );


  const representedAsUtc =
    Date.UTC(
      getPart("year"),
      getPart("month") - 1,
      getPart("day"),
      getPart("hour"),
      getPart("minute"),
      getPart("second")
    );


  return (
    representedAsUtc -
    instant.getTime()
  );

}


// Convert midnight in an IANA timezone to UTC.
export function getDayStartUtc(
  date: CalendarDate,
  timeZone: string
) {

  /*
    First treat the requested local midnight
    as though it were UTC.
  */
  const approximate =
    new Date(
      Date.UTC(
        date.year,
        date.month - 1,
        date.day,
        0,
        0,
        0,
        0
      )
    );


  /*
    Find the timezone offset near that instant,
    then correct the approximation.
  */
  let offset =
    getTimeZoneOffsetMilliseconds(
      approximate,
      timeZone
    );


  let result =
    new Date(
      approximate.getTime() -
      offset
    );


  /*
    Recalculate once at the resulting instant.
    This handles DST offset changes around
    the requested date.
  */
  const correctedOffset =
    getTimeZoneOffsetMilliseconds(
      result,
      timeZone
    );


  if (
    correctedOffset !== offset
  ) {

    offset =
      correctedOffset;


    result =
      new Date(
        approximate.getTime() -
        offset
      );

  }


  return result;
}


// Get the next local midnight.
export function getNextDayStartUtc(
  date: CalendarDate,
  timeZone: string
) {

  const nextDay =
    addCalendarDays(
      date,
      1
    );


  return getDayStartUtc(
    nextDay,
    timeZone
  );
}


// Store a logical report day as PostgreSQL DATE.
export function calendarDateToDatabaseDate(
  date: CalendarDate
) {

  return new Date(
    Date.UTC(
      date.year,
      date.month - 1,
      date.day
    )
  );
}


// Display/log YYYY-MM-DD.
export function formatReportDateKey(
  date: CalendarDate
) {

  return [
    date.year,
    String(date.month).padStart(2, "0"),
    String(date.day).padStart(2, "0")
  ].join("-");
}