import { getLastWeekDateRange } from './get-last-week-range.util';

/**
 * The weekly report's reporting period. The ticket's acceptance criteria fix
 * this precisely: a report generated on a Monday covers the immediately
 * preceding Monday through Sunday.
 */
describe('getLastWeekDateRange', () => {
  const at = (y: number, m: number, d: number, h = 8) => {
    jest.useFakeTimers().setSystemTime(new Date(y, m, d, h, 0, 0));
    return getLastWeekDateRange();
  };

  afterEach(() => jest.useRealTimers());

  // The worked examples from the ticket.
  it.each([
    ['Monday, Aug 10 2026', 2026, 7, 10, '2026-08-03', '2026-08-09'],
    ['Monday, Aug 17 2026', 2026, 7, 17, '2026-08-10', '2026-08-16'],
    ['Monday, Aug 24 2026', 2026, 7, 24, '2026-08-17', '2026-08-23'],
  ])(
    'should cover the previous Monday to Sunday when run on %s',
    (_label, y, m, d, startDate, endDate) => {
      expect(at(y as number, m as number, d as number)).toMatchObject({
        startDate,
        endDate,
      });
    },
  );

  it('should always start on a Monday and end on a Sunday', () => {
    const { startDate, endDate } = at(2026, 7, 24);

    // Parsed as local dates so the weekday matches the generated boundaries.
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    expect(new Date(sy, sm - 1, sd).getDay()).toBe(1); // Monday
    expect(new Date(ey, em - 1, ed).getDay()).toBe(0); // Sunday
  });

  it('should span exactly seven days', () => {
    const { startDate, endDate } = at(2026, 7, 24);
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);

    const days =
      (new Date(ey, em - 1, ed).getTime() -
        new Date(sy, sm - 1, sd).getTime()) /
      86_400_000;
    expect(days).toBe(6); // inclusive range: Mon..Sun
  });

  it('should not include the day the report runs', () => {
    const { endDate } = at(2026, 7, 24);

    // Aug 24 is the run day; the period must stop the day before.
    expect(endDate).toBe('2026-08-23');
  });

  it('should cross a month boundary correctly', () => {
    // Monday 2026-09-07 -> previous week is Aug 31 (Mon) to Sep 6 (Sun).
    expect(at(2026, 8, 7)).toMatchObject({
      startDate: '2026-08-31',
      endDate: '2026-09-06',
    });
  });

  it('should cross a year boundary correctly', () => {
    // Monday 2027-01-04 -> previous week is Dec 28 2026 to Jan 3 2027.
    expect(at(2027, 0, 4)).toMatchObject({
      startDate: '2026-12-28',
      endDate: '2027-01-03',
    });
  });
});
