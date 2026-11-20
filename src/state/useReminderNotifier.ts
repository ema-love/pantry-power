import { useEffect } from 'react';
import { useStore } from './store';
import { dueReminders, reminderMessage, showSystemNotification } from '../lib/reminders';
import { today } from '../lib/dates';

/**
 * While the app is open, show a browser notification once per day for each due market trip.
 * Reminders are always visible inside the app as well, so nothing depends on notifications.
 */
export function useReminderNotifier() {
  const { data, dispatch } = useStore();

  useEffect(() => {
    const check = () => {
      const now = today();
      for (const due of dueReminders(data, now)) {
        if (due.daysAway < 0 || due.trip.notifiedOn.includes(now)) continue;
        const { title, body } = reminderMessage(due, due.trip.shoppingListItems.length);
        if (showSystemNotification(title, body, `trip-${due.trip.id}-${now}`)) {
          dispatch({ type: 'trip/markNotified', id: due.trip.id, date: now });
        }
      }
    };
    check();
    const timer = window.setInterval(check, 60_000);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [data, dispatch]);
}
