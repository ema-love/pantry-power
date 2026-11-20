import { FlaskConical } from 'lucide-react';
import { useStore } from '../state/store';
import { hasDemoData } from '../lib/demo';
import { useConfirm } from './ui/Confirm';
import { useToast } from './ui/Toast';
import { Button } from './ui/Button';

export function useRemoveDemo() {
  const { dispatch } = useStore();
  const confirm = useConfirm();
  const toast = useToast();
  return async () => {
    const ok = await confirm({
      title: 'Remove demo data?',
      message: 'All items, shopping list entries and trips marked “Demo” will be removed. Anything you added yourself stays.',
      confirmLabel: 'Remove demo data',
      danger: true,
    });
    if (ok) {
      dispatch({ type: 'demo/remove' });
      toast({ message: 'Demo data removed' });
    }
  };
}

export function DemoBanner() {
  const { data } = useStore();
  const removeDemo = useRemoveDemo();
  if (!hasDemoData(data)) return null;
  return (
    <div className="mb-5 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-terracotta/50 bg-terracotta-50/60 p-4 sm:flex-row sm:items-center">
      <FlaskConical className="hidden h-6 w-6 shrink-0 text-terracotta-600 sm:block" aria-hidden />
      <p className="flex-1 text-[0.95rem] text-charcoal">
        <strong>You're exploring demo data.</strong> Sample items are marked <span className="font-bold text-terracotta-600">DEMO</span>. Remove them when you're ready to add your own.
      </p>
      <Button size="sm" variant="secondary" onClick={removeDemo}>
        Remove demo data
      </Button>
    </div>
  );
}
