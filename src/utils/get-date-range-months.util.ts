/**
 * Get all months between startDate and endDate
 * Returns array of month plans with startDate, endDate, and monthName
 */
export function getDateRangeMonths(
  startDate: string,
  endDate: string,
): Array<{ monthName: string; startDate: string; endDate: string }> {
  const start = new Date(startDate + 'T00:00:00.000Z');
  const end = new Date(endDate + 'T23:59:59.999Z');

  const months: Array<{
    monthName: string;
    startDate: string;
    endDate: string;
  }> = [];

  // Start from the first day of the start month (use UTC methods to avoid timezone issues)
  const current = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
  );
  // End at the first day of the end month (we'll include this month)
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (current <= last) {
    const year = current.getUTCFullYear();
    const month = current.getUTCMonth();

    const startOfMonth = new Date(Date.UTC(year, month, 1));
    // Calculate last day of this month: next month's day 0
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0));

    // For the last month in range, use the actual endDate if it's before month end
    let actualEndDate = endOfMonth.toISOString().substring(0, 10);
    if (current.getTime() === last.getTime()) {
      // This is the last month, use the provided endDate if it's earlier
      const endDateStr = endDate.substring(0, 10);
      if (endDateStr < actualEndDate) {
        actualEndDate = endDateStr;
      }
    }

    // For the first month in range, use the actual startDate if it's after month start
    let actualStartDate = startOfMonth.toISOString().substring(0, 10);
    const firstMonthStart = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
    );
    if (current.getTime() === firstMonthStart.getTime()) {
      // This is the first month, use the provided startDate if it's later
      const startDateStr = startDate.substring(0, 10);
      if (startDateStr > actualStartDate) {
        actualStartDate = startDateStr;
      }
    }

    const monthName = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(startOfMonth);

    months.push({
      monthName,
      startDate: actualStartDate,
      endDate: actualEndDate,
    });

    // Move to the next month
    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return months;
}
