export const APPLICATION_TIMEZONE = "Asia/Dhaka";

export interface TimeZoneDateParts {
  year: string;
  month: string;
  day: string;
}

export function getDatePartsInTimeZone(
  date: Date,
  timeZone: string,
): TimeZoneDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Could not resolve date parts for timezone ${timeZone}`);
  }

  return { year, month, day };
}

export function getApplicationDateString(now: Date = new Date()): string {
  const parts = getDatePartsInTimeZone(now, APPLICATION_TIMEZONE);
  return `${parts.year}-${parts.month}-${parts.day}`;
}
