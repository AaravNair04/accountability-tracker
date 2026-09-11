export const RETENTION_DAY_OPTIONS =
  [
    30,
    90,
    180,
    365
  ] as const;


export type RetentionDayOption =
  typeof RETENTION_DAY_OPTIONS[number];


export function isValidRetentionDays(
  value: unknown
) {
  return (
    value === null ||
    RETENTION_DAY_OPTIONS.includes(
      value as RetentionDayOption
    )
  );
}
