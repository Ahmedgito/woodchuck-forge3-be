/**
 * Calculate the date range for the previous week (Monday to Sunday)
 * Returns dates in yyyy-MM-dd format
 */
export function getLastWeekDateRange(): {
  startDate: string;
  endDate: string;
  weekString: string;
} {
  const now = new Date();

  // Get last Monday
  const lastMonday = new Date(now);
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek + 6; // Go back to previous Monday
  lastMonday.setDate(now.getDate() - daysToSubtract);
  lastMonday.setHours(0, 0, 0, 0);

  // Get last Sunday (6 days after last Monday)
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  // Format dates as yyyy-MM-dd
  const startDate = formatDate(lastMonday);
  const endDate = formatDate(lastSunday);

  // Create week string (month-year format from the Monday)
  const monthIndex = lastMonday.getMonth();
  const year = lastMonday.getFullYear();
  const weekString = `${monthIndex}-${year}`;

  return { startDate, endDate, weekString };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentWeekDateRange(): {
  startDate: string;
  endDate: string;
  weekString: string;
} {
  const now = new Date();

  // Get current Monday
  const currentMonday = new Date(now);
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Go back to current week's Monday
  currentMonday.setDate(now.getDate() - daysToSubtract);
  currentMonday.setHours(0, 0, 0, 0);

  // Get current Sunday (6 days after Monday)
  const currentSunday = new Date(currentMonday);
  currentSunday.setDate(currentMonday.getDate() + 6);
  currentSunday.setHours(23, 59, 59, 999);

  // Format dates as yyyy-MM-dd
  const startDate = formatDate(currentMonday);
  const endDate = formatDate(currentSunday);

  // Create week string (month-year format from the Monday)
  const monthIndex = currentMonday.getMonth();
  const year = currentMonday.getFullYear();
  const weekString = `${monthIndex}-${year}`;

  return { startDate, endDate, weekString };
}
