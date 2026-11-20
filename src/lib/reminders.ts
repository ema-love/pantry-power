import type { AppData, MarketTrip } from '../types';
import { daysBetween, today } from './dates';

export type NotificationSupport = 'unsupported' | NotificationPermission;

export function notificationSupport(): NotificationSupport {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** Ask for permission — only ever called from a user action such as switching a reminder on. */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (notificationSupport() === 'unsupported') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationSupport();
  }
}

export interface DueReminder {
  trip: MarketTrip;
  daysAway: number;
}

/** Planned trips with reminders on that are today, tomorrow (if enabled) or overdue. */
export function dueReminders(data: AppData, now: string = today()): DueReminder[] {
  if (!data.settings.remindersEnabled) return [];
  return data.trips
    .filter((t) => t.status === 'planned' && t.reminderEnabled)
    .map((trip) => ({ trip, daysAway: daysBetween(now, trip.plannedDate) }))
    .filter(({ daysAway }) => daysAway <= 0 || (daysAway === 1 && data.settings.remindDayBefore))
    .sort((a, b) => a.daysAway - b.daysAway);
}

export function reminderMessage({ trip, daysAway }: DueReminder, itemCount: number): { title: string; body: string } {
  const items = itemCount ? ` ${itemCount} item${itemCount === 1 ? '' : 's'} on the list.` : '';
  if (daysAway === 1) return { title: `Market trip tomorrow`, body: `${trip.title} is planned for tomorrow.${items}` };
  if (daysAway === 0) return { title: `Market day today`, body: `${trip.title} is planned for today.${items}` };
  return { title: `Did you go to the market?`, body: `${trip.title} was planned ${Math.abs(daysAway)} day${daysAway === -1 ? '' : 's'} ago. Mark it done when you've shopped.` };
}

/** Show a system notification. Returns false when that is not possible. */
export function showSystemNotification(title: string, body: string, tag: string): boolean {
  if (notificationSupport() !== 'granted') return false;
  try {
    new Notification(title, { body, tag, icon: '/icon.svg' });
    return true;
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
    return false;
  }
}
