export type SubmissionStatus = 'new' | 'submitted' | 'offer_sent' | 'accepted' | 'declined';

export interface StatusBadgeInfo {
  label: string;
  className: string;
}

const STATUS_BADGES: Record<SubmissionStatus, StatusBadgeInfo> = {
  new: { label: 'Draft', className: 'bg-ink-100 text-ink-600' },
  submitted: { label: 'New', className: 'bg-blue-500/10 text-blue-600' },
  offer_sent: { label: 'Offer sent', className: 'bg-navy-900 text-white' },
  accepted: { label: 'Accepted', className: 'bg-success-bg text-success' },
  declined: { label: 'Declined', className: 'bg-danger-bg text-danger' },
};

export function statusBadge(status: string): StatusBadgeInfo {
  return (
    STATUS_BADGES[status as SubmissionStatus] ?? {
      label: status,
      className: 'bg-ink-100 text-ink-600',
    }
  );
}
