/**
 * Dates in frontmatter are parsed as UTC midnight, so formatting must stay in
 * UTC or the day shifts for readers west of Greenwich.
 */
export function formatDate(date: Date, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** `YYYY-MM-DD`, suitable for `<time datetime>`. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
