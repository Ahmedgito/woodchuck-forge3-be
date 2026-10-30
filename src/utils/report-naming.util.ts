/**
 * Utility functions for report naming and formatting
 */

export interface WeeklyOverrides {
  weekly?: boolean;
  startDate?: string;
  endDate?: string;
}

/**
 * Gets the period label for a report (either weekly date range or month name)
 * @param monthName - The month name to use if not weekly
 * @param weeklyOverrides - Optional weekly override configuration
 * @returns The period label string
 */
export function getReportPeriodLabel(
  monthName: string,
  weeklyOverrides?: WeeklyOverrides,
): string {
  if (weeklyOverrides?.weekly && weeklyOverrides.startDate && weeklyOverrides.endDate) {
    return `${weeklyOverrides.startDate}-${weeklyOverrides.endDate}`;
  }
  return monthName;
}

/**
 * Gets the period prefix for filenames (with trailing dash if weekly)
 * @param weeklyOverrides - Optional weekly override configuration
 * @returns The period prefix string (empty if not weekly)
 */
export function getReportPeriodPrefix(weeklyOverrides?: WeeklyOverrides): string {
  if (weeklyOverrides?.weekly && weeklyOverrides.startDate && weeklyOverrides.endDate) {
    return `${weeklyOverrides.startDate}-${weeklyOverrides.endDate}-`;
  }
  return '';
}

