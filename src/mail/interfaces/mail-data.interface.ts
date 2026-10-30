export interface MailData<T = never> {
  to: string;
  /**
   * Addresses to CC, carried from the subscription that produced a report
   * (report_subscriptions.reportCcEmails). Visible to every recipient.
   */
  cc?: string[];
  data: T;
}
