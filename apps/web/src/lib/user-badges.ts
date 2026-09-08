import type { Role } from './role';

export interface BadgeInfo {
  label: string;
  className: string;
}

const ROLE_LABELS: Record<Role, string> = {
  seller: 'Seller',
  trade_desk: 'Trade Desk',
  admin: 'Administrator',
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

const STATUS_BADGES: Record<string, BadgeInfo> = {
  active: { label: 'Active', className: 'bg-success-bg text-success' },
  suspended: { label: 'Suspended', className: 'bg-ink-100 text-ink-600' },
  pending: { label: 'Pending', className: 'bg-warning-bg text-warning' },
};

export function userStatusBadge(status: string): BadgeInfo {
  return STATUS_BADGES[status] ?? { label: status, className: 'bg-ink-100 text-ink-600' };
}
