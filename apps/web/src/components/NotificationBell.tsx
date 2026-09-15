import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { formatRelativeAge } from '../lib/relative-time';
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from '../lib/notifications-api';

const POLL_INTERVAL_MS = 20_000;

export function NotificationBell() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const { count } = await getUnreadCount(authFetch);
      setUnreadCount(count);
    } catch {
      // Silently ignore — the bell just won't update this tick.
    }
  }, [authFetch]);

  useEffect(() => {
    // setState here happens after an await inside refreshUnreadCount(), not synchronously in
    // the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshUnreadCount();
    const interval = setInterval(() => {
      void refreshUnreadCount();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const { items } = await getNotifications(authFetch);
        setNotifications(items);
      } catch {
        setNotifications([]);
      }
    }
  }

  async function handleSelect(notification: NotificationRecord) {
    setOpen(false);
    if (!notification.readAt) {
      try {
        await markNotificationRead(authFetch, notification._id);
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch {
        // Navigation still proceeds even if marking as read failed.
      }
    }
    if (notification.link) {
      navigate(notification.link);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead(authFetch);
      setUnreadCount(0);
      setNotifications(
        (current) =>
          current?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null,
      );
    } catch {
      // Leave state as-is; the user can retry.
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          void toggleOpen();
        }}
        aria-label="Notifications"
        className="relative rounded-full p-2 text-ink-700 hover:bg-ink-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg bg-white shadow-[0_12px_32px_rgba(10,31,82,.18)]">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-2">
            <span className="text-sm font-semibold text-navy-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  void handleMarkAllRead();
                }}
                className="text-xs font-semibold text-blue-500 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications === null && <p className="px-4 py-4 text-sm text-ink-500">Loading…</p>}
            {notifications !== null && notifications.length === 0 && (
              <p className="px-4 py-4 text-sm text-ink-500">No notifications yet.</p>
            )}
            {notifications?.map((notification) => (
              <button
                key={notification._id}
                type="button"
                onClick={() => {
                  void handleSelect(notification);
                }}
                className={`block w-full border-b border-ink-100 px-4 py-3 text-left text-sm last:border-0 hover:bg-ink-50 ${
                  notification.readAt ? '' : 'bg-blue-100/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink-900">{notification.title}</span>
                  <span className="shrink-0 text-[11px] text-ink-500">
                    {formatRelativeAge(notification.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-ink-700">{notification.body}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
