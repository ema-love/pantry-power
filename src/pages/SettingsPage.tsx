import { useRef, useState } from 'react';
import { BellRing, Download, FileSpreadsheet, FlaskConical, HardDrive, Home, Ruler, Shapes, Trash2, Upload, X } from 'lucide-react';
import type { AppData } from '../types';
import { useStore } from '../state/store';
import { PageHeader } from '../components/layout/PageHeader';
import { useRemoveDemo } from '../components/DemoBanner';
import { Button, ButtonLink } from '../components/ui/Button';
import { Switch } from '../components/ui/Checkbox';
import { useConfirm } from '../components/ui/Confirm';
import { useToast } from '../components/ui/Toast';
import { getCategoryIcon } from '../lib/icons';
import { hasDemoData } from '../lib/demo';
import { downloadBackup, parseBackup } from '../lib/storage';
import { today } from '../lib/dates';
import { notificationSupport, requestNotificationPermission, type NotificationSupport } from '../lib/reminders';
import { permissionNote } from '../components/market/TripForm';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

function Panel({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6" aria-label={title}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-olive-100 text-olive-700">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold text-charcoal">{title}</h2>
          {description && <p className="text-[0.95rem] text-stone-warm">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const { data, dispatch } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const removeDemo = useRemoveDemo();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(data.settings.householdName);
  const [permission, setPermission] = useState<NotificationSupport>(notificationSupport);

  const saveName = () => {
    const trimmed = name.trim().slice(0, 60);
    if (trimmed === data.settings.householdName) return;
    dispatch({ type: 'settings/update', patch: { householdName: trimmed } });
    toast({ message: 'Household name saved' });
  };

  const toggleUnit = (id: string) => {
    const current = data.settings.preferredUnits;
    if (current.includes(id) && current.length <= 1) {
      toast({ message: 'Keep at least one unit switched on', tone: 'error' });
      return;
    }
    dispatch({
      type: 'settings/update',
      patch: { preferredUnits: current.includes(id) ? current.filter((u) => u !== id) : [...current, id] },
    });
  };

  const exportData = () => {
    downloadBackup(data, today());
    toast({ message: 'Backup file downloaded' });
  };

  const importData = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    let parsed: { data: AppData; dropped: number };
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('That file is too large to be a Pantry Power backup.');
      parsed = parseBackup(await file.text());
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'That file could not be read.', tone: 'error' });
      return;
    }
    const d = parsed.data;
    const ok = await confirm({
      title: 'Restore this backup?',
      message: (
        <>
          <p>
            The backup has <strong>{d.items.length}</strong> pantry item{d.items.length === 1 ? '' : 's'}, <strong>{d.shoppingList.length}</strong> shopping list
            entr{d.shoppingList.length === 1 ? 'y' : 'ies'} and <strong>{d.trips.length}</strong> market trip{d.trips.length === 1 ? '' : 's'}.
          </p>
          <p className="mt-2">It will replace everything currently in Pantry Power on this device.</p>
          {parsed.dropped > 0 && <p className="mt-2 text-amber-deep">{parsed.dropped} damaged record(s) in the file will be skipped.</p>}
        </>
      ),
      confirmLabel: 'Replace my data',
      danger: true,
    });
    if (!ok) return;
    dispatch({ type: 'data/replace', data: d });
    toast({ message: 'Backup restored' });
  };

  const clearAll = async () => {
    const ok = await confirm({
      title: 'Delete all household data?',
      message: (
        <>
          <p>This permanently deletes every pantry item, your shopping list, market trips and settings on this device.</p>
          <p className="mt-2 font-semibold text-charcoal">Tip: export a backup first so you can restore it later.</p>
        </>
      ),
      confirmLabel: 'Delete everything',
      danger: true,
    });
    if (!ok) return;
    dispatch({ type: 'data/clear' });
    setName('');
    toast({ message: 'All household data deleted' });
  };

  const enableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') toast({ message: 'Notifications allowed' });
  };

  const customCategories = data.categories.filter((c) => c.isCustom);
  const customUnits = data.units.filter((u) => u.isCustom);

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <Panel icon={Home} title="Household">
            <label className="block">
              <span className="mb-1.5 block font-semibold text-charcoal">Household name</span>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())}
                placeholder="e.g. The Adeyemi Home"
                maxLength={60}
              />
            </label>
            <p className="mt-1.5 text-sm text-stone-warm">Shown on your home screen.</p>
          </Panel>

          <Panel icon={BellRing} title="Reminders" description="Get reminded about planned market trips.">
            <div className="divide-y divide-line/70">
              <Switch
                checked={data.settings.remindersEnabled}
                onChange={(v) => dispatch({ type: 'settings/update', patch: { remindersEnabled: v } })}
                label="Market trip reminders"
                description="Shown on your home screen and, if allowed, as a phone notification."
              />
              <div className="py-1">
                <Switch
                  checked={data.settings.remindDayBefore}
                  disabled={!data.settings.remindersEnabled}
                  onChange={(v) => dispatch({ type: 'settings/update', patch: { remindDayBefore: v } })}
                  label="Also remind me the day before"
                />
              </div>
              <div className="pt-3">
                {permission === 'granted' ? (
                  <p className="text-sm text-olive-700">Notifications are allowed on this device. They appear while Pantry Power is open in your browser.</p>
                ) : permission === 'default' ? (
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-sm text-stone-warm">Allow notifications to get a pop-up reminder as well as the one inside the app.</p>
                    <Button size="sm" variant="secondary" icon={BellRing} onClick={enableNotifications}>
                      Allow notifications
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-stone-warm">{permissionNote(permission)}</p>
                )}
              </div>
            </div>
          </Panel>

          <Panel icon={Ruler} title="Measurement units" description="Choose which units appear when you add items.">
            <div className="flex flex-wrap gap-2">
              {data.units.map((u) => {
                const on = data.settings.preferredUnits.includes(u.id);
                return (
                  <button key={u.id} type="button" aria-pressed={on} onClick={() => toggleUnit(u.id)} className={`chip ${on ? 'chip-on' : 'chip-off'}`}>
                    {u.plural}
                  </button>
                );
              })}
            </div>
            {customUnits.length > 0 && (
              <p className="mt-3 text-sm text-stone-warm">Units you created: {customUnits.map((u) => u.singular).join(', ')}. Add more from the unit list when adding an item.</p>
            )}
          </Panel>

          {customCategories.length > 0 && (
            <Panel icon={Shapes} title="Your categories" description="Removing a category moves its items to “Other”.">
              <ul className="divide-y divide-line/70">
                {customCategories.map((c) => {
                  const Icon = getCategoryIcon(c.icon);
                  return (
                    <li key={c.id} className="flex items-center gap-3 py-1.5">
                      <Icon className="h-5 w-5 text-olive-600" aria-hidden />
                      <span className="flex-1 font-semibold">{c.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove category ${c.name}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-stone-warm hover:bg-cream hover:text-danger"
                        onClick={async () => {
                          if (await confirm({ title: `Remove “${c.name}”?`, message: 'Items in this category will move to “Other”.', confirmLabel: 'Remove category' })) {
                            dispatch({ type: 'category/delete', id: c.id });
                            toast({ message: 'Category removed' });
                          }
                        }}
                      >
                        <X className="h-5 w-5" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
        </div>

        <div className="space-y-5">
          <Panel icon={HardDrive} title="Your data" description="Everything is saved on this device only. It does not sync between phones or computers.">
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" icon={Download} onClick={exportData}>
                Export backup
              </Button>
              <Button variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>
                Import backup
              </Button>
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Choose backup file" onChange={(e) => importData(e.target.files?.[0])} />
            <p className="mt-3 text-sm text-stone-warm">
              Export a backup now and then — for example after a big market restock — and keep the file somewhere safe. You can also use it to move your pantry to another phone.
            </p>
          </Panel>

          <Panel icon={FileSpreadsheet} title="Import items from a spreadsheet" description="Add or update many pantry items at once from Excel, CSV or a pasted list.">
            <ButtonLink to="/import" variant="secondary" icon={FileSpreadsheet}>
              Import from a file
            </ButtonLink>
          </Panel>

          <Panel icon={FlaskConical} title="Demo data" description="Sample Nigerian pantry items to try the app with.">
            {hasDemoData(data) ? (
              <Button variant="secondary" onClick={removeDemo}>
                Remove demo data
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  dispatch({ type: 'demo/load' });
                  toast({ message: 'Demo items added. They are marked “Demo”.' });
                }}
              >
                Load demo data
              </Button>
            )}
          </Panel>

          <section className="rounded-2xl border border-danger/30 bg-danger-soft/40 p-5 sm:p-6" aria-label="Danger zone">
            <h2 className="text-lg font-bold text-danger-deep">Clear household data</h2>
            <p className="mt-1 text-[0.95rem] text-stone-warm">Delete everything stored by Pantry Power on this device. This cannot be undone.</p>
            <Button variant="danger" icon={Trash2} className="mt-4" onClick={clearAll}>
              Delete all data
            </Button>
          </section>

          <p className="px-1 text-center text-sm text-stone-light">Pantry Power · Version 1.0</p>
        </div>
      </div>
    </>
  );
}
