import { describe, expect, it } from 'vitest';

import { formatDate, toIsoDate } from '../../src/lib/dates';

describe('formatDate', () => {
  it('formats a UTC-midnight date in en-GB by default', () => {
    expect(formatDate(new Date('2026-09-02'))).toBe('2 September 2026');
  });

  it('does not shift the day for dates late in the UTC day', () => {
    expect(formatDate(new Date('2026-09-02T23:59:59Z'))).toBe('2 September 2026');
  });

  it('accepts another locale', () => {
    expect(formatDate(new Date('2026-09-02'), 'en-US')).toBe('September 2, 2026');
  });
});

describe('toIsoDate', () => {
  it('returns the YYYY-MM-DD part only', () => {
    expect(toIsoDate(new Date('2026-09-02T00:00:00Z'))).toBe('2026-09-02');
  });
});
