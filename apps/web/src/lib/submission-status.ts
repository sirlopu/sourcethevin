export const SUBMISSION_STATUSES = [
  'new',
  'submitted',
  'offer_sent',
  'in_negotiation',
  'accepted',
  'declined',
  'closed',
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export interface StatusBadgeInfo {
  label: string;
  className: string;
}

const STATUS_BADGES: Record<SubmissionStatus, StatusBadgeInfo> = {
  new: { label: 'Draft', className: 'bg-ink-100 text-ink-600' },
  submitted: { label: 'New', className: 'bg-blue-500/10 text-blue-600' },
  offer_sent: { label: 'Offer Received', className: 'bg-navy-900 text-white' },
  in_negotiation: { label: 'In Negotiation', className: 'bg-warning-bg text-warning' },
  accepted: { label: 'Accepted', className: 'bg-success-bg text-success' },
  declined: { label: 'Declined', className: 'bg-danger-bg text-danger' },
  closed: { label: 'Closed', className: 'bg-ink-200 text-ink-700' },
};

export function statusBadge(status: string, context?: 'seller' | 'trade_desk' | 'desk'): StatusBadgeInfo {
  if ((context === 'trade_desk' || context === 'desk') && status === 'offer_sent') {
    return STATUS_BADGES.in_negotiation;
  }

  return (
    STATUS_BADGES[status as SubmissionStatus] ?? {
      label: status,
      className: 'bg-ink-100 text-ink-600',
    }
  );
}
