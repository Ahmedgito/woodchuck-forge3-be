export const CRON_EXPRESSIONS = {
  EVERY_1ST_DAY_OF_MONTH_AT_00_15: '15 0 1 * *',
  EVERY_1ST_DAY_OF_YEAR_AT_00_00: '0 0 1 1 *',
  EVERY_10_MINUTES: '*/10 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
  EVERY_3_HOURS: '0 */3 * * *',
  TEST_CRON_EXPRESSION: '*/1 * * * *', // Every 1 minute
  EVERY_DAY_AT_08_10: '0 10 8 * * *', // Every day at 08:10 AM
  EVERY_DAY_FROM_08_30_TO_17_30: '0 30 8-17 * * *', // Every hour at minute 30 from 9 AM to 6 PM (9:30, 10:30, 11:30, etc.)
  EVERY_DAY_FROM_09_00_TO_17_00: '0 0 9-17 * * *', // Every hour at minute 0 from 9 AM to 6 PM (9:00, 11:00, 12:00, etc.)
  EVERY_1ST_DAY_OF_MONTH_AT_08_00: '0 8 1 * *', // Every 1st day of the month at 8 AM
  EVERY_1ST_DAY_OF_MONTH_AT_02_00: '0 2 1 * *', // Every 1st day of the month at 2 AM
  EVERY_MONDAY_AT_08_00: '0 8 * * 1', // Every Monday at 8 AM (weekly)
  EVERY_FRIDAY_AT_08_00: '0 8 * * 5', // Every Friday at 8 AM (weekly)
};
