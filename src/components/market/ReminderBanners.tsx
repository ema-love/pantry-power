import { BellRing } from 'lucide-react';
import { useStore } from '../../state/store';
import { dueReminders, reminderMessage } from '../../lib/reminders';
import { ButtonLink } from '../ui/Button';

/** In-app reminders for market trips — always shown, whether or not browser notifications are allowed. */
export function ReminderBanners({ linkToMarket }: { linkToMarket?: boolean }) {
  const { data } = useStore();
  const due = dueReminders(data);
  if (due.length === 0) return null;
  return (
    <div className="mb-5 space-y-2" role="status">
      {due.map((d) => {
        const count = d.trip.shoppingListItems.filter((id) => data.shoppingList.some((s) => s.id === id && !s.isCompleted)).length;
        const { title, body } = reminderMessage(d, count);
        const overdue = d.daysAway < 0;
        return (
          <div
            key={d.trip.id}
            className={`flex flex-col items-start gap-3 rounded-2xl p-4 sm:flex-row sm:items-center ${overdue ? 'bg-cream ring-1 ring-line' : 'bg-amber-soft ring-1 ring-amber/30'}`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${overdue ? 'bg-white text-stone-warm' : 'bg-white/70 text-amber-deep'}`}>
              <BellRing className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-charcoal">{title}</p>
              <p className="text-[0.95rem] text-stone-warm">{body}</p>
            </div>
            {linkToMarket && (
              <ButtonLink to="/market" size="sm" variant="secondary">
                {overdue ? 'Review trip' : 'See the list'}
              </ButtonLink>
            )}
          </div>
        );
      })}
    </div>
  );
}
