import { ArchiveReportPlanDto } from '../job-sites/dto/archive-report-request.dto';

export function buildArchivePlan(months: string[]): ArchiveReportPlanDto[] {
  return months
    .map((m) => {
      const [monthStr, yearStr] = m.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10);

      if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        throw new Error(`Invalid month index: ${monthStr}`);
      }

      // Start of month
      const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));

      // End of month → next month - 1 ms
      const endDate = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));
      endDate.setMilliseconds(endDate.getMilliseconds() - 1);

      const monthName = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
      }).format(startDate);

      return {
        month: m,
        monthName,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };
    })
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
}
