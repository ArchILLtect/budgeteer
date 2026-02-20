import { isoToDayKey, toUtcDayKey } from "./inboxTriage";

/**
 * Returns the user's IANA timezone name (e.g. "America/New_York"), or "UTC" as a fallback.
 * Note: this is used for user-facing date formatting and input value generation,
 * so we want it to reflect the user's actual timezone if possible.
 * @returns {string} The user's timezone name or "UTC" if it cannot be determined.
 */
export function getUserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length > 0 ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Returns today's date in YYYY-MM-DD suitable for `<input type="date" />`.
 *
 * Note: this is intentionally user-timezone aware (via Intl).
 */
export function getTodayDateInputValue(timeZone: string = getUserTimeZone()): string {
  // en-CA reliably formats as YYYY-MM-DD.
  return new Date().toLocaleDateString("en-CA", { timeZone });
}

/**
 * Converts an absolute timestamp (ms since epoch) into a YYYY-MM-DD string in the given timezone.
 * Useful for "now" comparisons without forcing UTC semantics.
 */
export function msToDateInputValue(ms: number, timeZone: string = getUserTimeZone()): string {
  return new Date(ms).toLocaleDateString("en-CA", { timeZone });
}

function parseIsoDateTime(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Formats an ISO timestamp as "MMM D, YYYY" in the user's locale/timezone.
 * Example: 2026-02-18T20:31:00Z → "Feb 18, 2026"
 */
export function formatLocalIsoDate(
  iso?: string | null,
  opts?: { noneLabel?: string; locale?: string | string[] }
): string {
  const noneLabel = opts?.noneLabel ?? "—";
  if (!iso) return noneLabel;
  const d = parseIsoDateTime(iso);
  if (!d) return noneLabel;
  return d.toLocaleDateString(opts?.locale ?? "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats an ISO timestamp as "MMM D HH:mm" (24-hour) in the user's locale/timezone.
 * Example: 2026-02-18T20:31:00Z → "Feb 18 14:31" (depending on timezone)
 */
export function formatLocalIsoMonthDayTime24(
  iso?: string | null,
  opts?: { noneLabel?: string; locale?: string | string[] }
): string {
  const noneLabel = opts?.noneLabel ?? "—";
  if (!iso) return noneLabel;
  const d = parseIsoDateTime(iso);
  if (!d) return noneLabel;

  const datePart = d.toLocaleDateString(opts?.locale ?? "en-US", {
    month: "short",
    day: "numeric",
  });
  const timePart = d.toLocaleTimeString(opts?.locale ?? "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${datePart} ${timePart}`;
}

/**
 * Formats an ISO timestamp as "MMM D, YYYY @ h:mm A" in the user's locale/timezone.
 * Example: 2026-02-18T20:31:00Z → "Feb 18, 2026 @ 2:31 PM" (depending on timezone)
 */
export function formatLocalIsoDateAtTime(
  iso?: string | null,
  opts?: { noneLabel?: string; locale?: string | string[] }
): string {
  const noneLabel = opts?.noneLabel ?? "—";
  if (!iso) return noneLabel;
  const d = parseIsoDateTime(iso);
  if (!d) return noneLabel;

  const datePart = formatLocalIsoDate(iso, { noneLabel, locale: opts?.locale });
  const timePart = d.toLocaleTimeString(opts?.locale ?? "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${datePart} @ ${timePart}`;
}

/**
 * Parses a YYYY-MM-DD string into its components.
 * Note: this is a simple regex-based parser to avoid timezone-dependent Date parsing.
 * @param dayKey - The date string in YYYY-MM-DD format.
 * @returns An object with year, month, and day as numbers, or null if the input is invalid.
 */
function parseDayKey(dayKey: string): { y: number; m: number; d: number } | null {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(dayKey);
  if (!match) return null;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;

  return { y, m, d };
}

/**
 * Parses a YYYY-MM string into its components.
 * Note: this is a simple regex-based parser to avoid timezone-dependent Date parsing.
 * @param monthKey - The month string in YYYY-MM format.
 * @returns An object with year and month as numbers, or null if the input is invalid.
 */
function parseMonthKey(monthKey: string): { y: number; m: number } | null {
  const match = /^([0-9]{4})-([0-9]{2})$/.exec(monthKey);
  if (!match) return null;

  const y = Number(match[1]);
  const m = Number(match[2]);

  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
  if (m < 1 || m > 12) return null;

  return { y, m };
}

/**
 * Converts an ISO datetime string into a YYYY-MM-DD day key.
 * Returns null if the input is not a valid ISO datetime or does not contain a date component.
 * Note: this is a simple regex-based parser to avoid timezone-dependent Date parsing.
 */
export function getYearFromMonthKey(monthKey: string): string | null {
  const parsed = parseMonthKey(monthKey);
  return parsed ? String(parsed.y) : null;
}

/**
 *  Converts a YYYY-MM month key into a zero-padded month string (MM).
 * @param monthKey - The month string in YYYY-MM format.
 * @returns A zero-padded month string (MM) or null if the input is invalid.
 */
export function getMonthFromMonthKey(monthKey: string): string | null {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return null;
  return String(parsed.m).padStart(2, "0");
}

/**
 * Formats a YYYY-MM month key into a localized month name and year string.
 * Example: "2026-02" → "February 2026"
 *
 * Note: we use UTC dates here to avoid timezone drift issues for users in negative offsets.
 * @param monthKey - The month string in YYYY-MM format.
 * @param opts - Formatting options:
 * @returns A formatted month and year string, or a fallback if the input is invalid.
 */
export function formatUtcMonthKey(
  monthKey: string,
  opts?: {
    noneLabel?: string;
    locale?: string | string[];
    month?: "short" | "long";
  }
): string {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return opts?.noneLabel ?? monthKey;

  const date = new Date(Date.UTC(parsed.y, parsed.m - 1, 1));
  return date.toLocaleDateString(opts?.locale ?? "en-US", {
    year: "numeric",
    month: opts?.month ?? "long",
    timeZone: "UTC",
  });
}

/**
 * Returns the first day of the month for the given day key.
 * @param dayKey - The date string in YYYY-MM-DD format.
 * @returns A day key string representing the first day of the month (YYYY-MM-01), or the original input if invalid.
 */
export function startOfMonthDayKey(dayKey: string): string {
  const parsed = parseDayKey(dayKey);
  if (!parsed) return dayKey;
  return `${dayKey.slice(0, 7)}-01`;
}


/**
 * Returns the last day of the month for the given day key.
 * Note: we calculate this by creating a UTC date for the 0th day of the next month,
 * which gives us the last day of the current month.
 * @param dayKey - The date string in YYYY-MM-DD format.
 * @returns A day key string representing the last day of the month, or the original input if invalid.
 */
export function endOfMonthDayKey(dayKey: string): string {
  const parsed = parseDayKey(dayKey);
  if (!parsed) return dayKey;

  // Last day of month: day 0 of next month (in UTC).
  // Note: `parsed.m` is 1-based (01-12). JS months are 0-based.
  const d = new Date(Date.UTC(parsed.y, parsed.m, 0));
  return d.toISOString().slice(0, 10);
}

/**
 * Formats a YYYY-MM-DD day key into a localized date string.
 * Example: "2026-02-14" → "Feb 14, 2026"
 *
 * Note: we use UTC dates here to avoid timezone drift issues for users in negative offsets.
 * @param dayKey - The date string in YYYY-MM-DD format.
 * @param opts - Formatting options:
 *  - noneLabel: A fallback string to return if the input is invalid. Defaults to the original input or "--".
 *  - locale: A locale string or array of locale strings for formatting. Defaults to the user's locale.
 *  - month: The month format, either "short" (e.g. "Feb") or "long" (e.g. "February"). Defaults to "short".
 * @returns A formatted date string, or a fallback if the input is invalid.
 */
export function formatUtcDayKey(
  dayKey: string,
  opts?: {
    noneLabel?: string;
    locale?: string | string[];
    month?: "short" | "long";
  }
): string {
  const parsed = parseDayKey(dayKey);
  if (!parsed) return opts?.noneLabel ?? dayKey;

  // Use a UTC date so the label does not drift for users in negative offsets.
  const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));

  return date.toLocaleDateString(opts?.locale, {
    year: "numeric",
    month: opts?.month ?? "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Formats a YYYY-MM-DD day key into a localized month+day string.
 * Example: "2026-02-03" → "Feb 03"
 *
 * Note: we use UTC dates here to avoid timezone drift issues for users in negative offsets.
 */
export function formatUtcDayKeyMonthDay(
  dayKey: string,
  opts?: { noneLabel?: string; locale?: string | string[]; month?: "short" | "long" }
): string {
  const parsed = parseDayKey(dayKey);
  if (!parsed) return opts?.noneLabel ?? dayKey;

  const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  return date.toLocaleDateString(opts?.locale ?? "en-US", {
    month: opts?.month ?? "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}

/**
 * Formats a YYYY-MM month key into a localized month and year string.
 * Example: "2026-02" → "February 2026"
 *
 * Note: we use UTC dates here to avoid timezone drift issues for users in negative offsets.
 * @param dayKey - The date string in YYYY-MM-DD format.
 * @param opts - Formatting options:
 * - noneLabel: A fallback string to return if the input is invalid. Defaults to the original input or "--".
 * - locale: A locale string or array of locale strings for formatting. Defaults to the user's locale.
 * - month: The month format, either "short" (e.g. "Feb") or "long" (e.g. "February"). Defaults to "long".
 * @returns A formatted month and year string, or a fallback if the input is invalid.
 */
export function formatUtcMonthYear(
  dayKey: string,
  opts?: {
    noneLabel?: string;
    locale?: string | string[];
    month?: "short" | "long";
  }
): string {
  const parsed = parseDayKey(dayKey);
  if (!parsed) return opts?.noneLabel ?? dayKey;

  const date = new Date(Date.UTC(parsed.y, parsed.m - 1, 1));
  return date.toLocaleDateString(opts?.locale, {
    year: "numeric",
    month: opts?.month ?? "long",
    timeZone: "UTC",
  });
}

/**
 * Adds a specified number of days to a given YYYY-MM-DD day key and returns the resulting day key.
 * Note: we use UTC dates here to avoid timezone drift issues for users in negative offsets.
 * @param dayKey - The date string in YYYY-MM-DD format to which days will be added.
 * @param days - The number of days to add (can be negative to subtract days).
 * @returns A new day key string in YYYY-MM-DD format representing the resulting date, or the original input if invalid.
 */
export function addDaysToDayKey(dayKey: string, days: number): string {
  const parsed = parseDayKey(dayKey);
  if (!parsed) return dayKey;

  // Use a UTC date so the result does not drift for users in negative offsets.
  // Note: `parsed.m` is 1-based (01-12). JS months are 0-based.
  const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the weekday index (0=Sunday, 1=Monday, ..., 6=Saturday) for a given YYYY-MM-DD day key.
 * Note: we use UTC dates here to avoid timezone drift issues for users in negative offsets.
 * @param dayKey - The date string in YYYY-MM-DD format.
 * @returns The weekday index (0-6) where 0=Sunday, or null if the input is invalid.
 */
export function getUtcWeekdayIndex(dayKey: string): number | null {
  const parsed = parseDayKey(dayKey);
  if (!parsed) return null;
  const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  return d.getUTCDay();
}

/**
 * Returns the day key for the start of the week containing the given day key, based on the specified week start day.
 * Note: we use UTC dates here to avoid timezone drift issues for users in negative offsets.
 * @param dayKey - The date string in YYYY-MM-DD format for which to find the start of the week.
 * @param weekStart - The index of the first day of the week (0=Sunday, 1=Monday, ..., 6=Saturday). Defaults to 1 (Monday).
 * @returns A day key string in YYYY-MM-DD format representing the start of the week, or the original input if invalid.
 */
export function startOfWeekDayKey(dayKey: string, weekStart: number = 1): string {
  const weekday = getUtcWeekdayIndex(dayKey);
  if (weekday == null) return dayKey;

  // Normalize weekStart to be within 0-6 and calculate the delta to the start of the week.
  const normalizedWeekStart = ((weekStart % 7) + 7) % 7;
  // Calculate number of days to subtract to get to the start of the week.
  const delta = (weekday - normalizedWeekStart + 7) % 7;
  return addDaysToDayKey(dayKey, -delta);
}

/**
 * Formats a YYYY-MM-DD day key into a localized date string that includes the weekday.
 * Example: "2026-02-14" → "Sat, Feb 14, 2026"
 *
 * Note: we use UTC dates here to avoid timezone drift issues for users in negative offsets.
 * @param dayKey - The date string in YYYY-MM-DD format.
 * @param opts - Formatting options:
 * - noneLabel: A fallback string to return if the input is invalid. Defaults to the original input or "--".
 * - locale: A locale string or array of locale strings for formatting. Defaults to the user's locale.
 * - month: The month format, either "short" (e.g. "Feb") or "long" (e.g. "February"). Defaults to "short".
 * - weekday: The weekday format, either "short" (e.g. "Sat") or "long" (e.g. "Saturday"). Defaults to "short".
 * @returns A formatted date string that includes the weekday, or a fallback if the input is invalid.
 */
export function formatUtcDayKeyWithWeekday(
  dayKey: string,
  opts?: {
    noneLabel?: string;
    locale?: string | string[];
    month?: "short" | "long";
    weekday?: "short" | "long";
  }
): string {
  const parsed = parseDayKey(dayKey);
  if (!parsed) return opts?.noneLabel ?? dayKey;

  // Use a UTC date so the label does not drift for users in negative offsets.
  // Note: `parsed.m` is 1-based (01-12). JS months are 0-based.
  const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  return date.toLocaleDateString(opts?.locale, {
    weekday: opts?.weekday ?? "short",
    year: "numeric",
    month: opts?.month ?? "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Formats an ISO datetime string (our `dueAt`) into a localized date string.
 * Example: "2026-02-14T15:00:00Z" → "Feb 14, 2026"
 * Note: we treat `dueAt` as a day-only “floating” value; extracting the ISO day key avoids timezone-dependent Date parsing.
 * @see isoToDateInputValue
 * @param dueAt - The ISO datetime string to format.
 * @param opts - Formatting options:
 * - noneLabel: A fallback string to return if the input is invalid. Defaults to "Someday".
 * - locale: A locale string or array of locale strings for formatting. Defaults to the user's locale.
 * - month: The month format, either "short" (e.g. "Feb") or "long" (e.g. "February"). Defaults to "short".
 * @returns A formatted date string, or a fallback if the input is invalid.
 */
export function formatDueDate(
  dueAt?: string | null,
  opts?: { noneLabel?: string; locale?: string | string[]; month?: "short" | "long" }
): string {
  const noneLabel = opts?.noneLabel ?? "Someday";
  // Extract the day key from the ISO datetime to avoid timezone-dependent Date parsing,
  // treating it as a day-only “floating” value.
  const dueKey = isoToDayKey(dueAt);
  if (!dueKey) return noneLabel;
  return formatUtcDayKey(dueKey, { noneLabel, locale: opts?.locale, month: opts?.month });
}

/**
 * Converts an ISO datetime string into a YYYY-MM-DD string suitable for `<input type="date" />`.
 * Note: we extract the day key from the ISO datetime to avoid timezone-dependent Date parsing,
 * treating it as a day-only “floating” value.
 * @param iso - The ISO datetime string to convert.
 * @returns A date string in YYYY-MM-DD format, or an empty string if the input is invalid.
 * @see formatDueDate
 */
export function isoToDateInputValue(iso?: string | null): string {
  // Extract the day key from the ISO datetime to avoid timezone-dependent Date parsing,
  // treating it as a day-only “floating” value.
  const dayKey = isoToDayKey(iso);
  return dayKey ?? "";
}

/**
 * Returns the current date as a YYYY-MM-DD string in UTC.
 * Note: we use UTC here to avoid timezone drift issues for users in negative offsets.
 * @param nowMs - Optional timestamp in milliseconds to use as the current time. Defaults to Date.now().
 * @returns A date string in YYYY-MM-DD format representing the current date in UTC.
 * @see getTodayDateInputValue
 */
export function getNowUtcDayKey(nowMs: number = Date.now()): string {
  return toUtcDayKey(nowMs);
}
