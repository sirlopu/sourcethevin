import type { AuthFetch } from './auth-context';
import { parseJson } from './http';

export interface NotificationRecord {
  _id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  items: NotificationRecord[];
  total: number;
  page: number;
  limit: number;
}

export function getNotifications(authFetch: AuthFetch, unreadOnly = false) {
  return parseJson<NotificationsResponse>(
    authFetch(`/notifications?unreadOnly=${unreadOnly ? 'true' : 'false'}&limit=20`),
  );
}

export function getUnreadCount(authFetch: AuthFetch) {
  return parseJson<{ count: number }>(authFetch('/notifications/unread-count'));
}

export function markNotificationRead(authFetch: AuthFetch, id: string) {
  return parseJson<NotificationRecord>(authFetch(`/notifications/${id}/read`, { method: 'PATCH' }));
}

export async function markAllNotificationsRead(authFetch: AuthFetch): Promise<void> {
  const response = await authFetch('/notifications/read-all', { method: 'POST' });
  if (!response.ok) {
    throw new Error('Unable to mark notifications as read.');
  }
}
