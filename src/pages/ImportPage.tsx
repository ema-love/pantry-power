import { useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import {
  ArrowRight, CircleAlert, ClipboardList, Download, FileSpreadsheet, PackageCheck, PackagePlus, RotateCcw, ShoppingBasket, Upload,
} from 'lucide-react';
import type { Unit } from '../types';
import { useStore } from '../state/store';
import type { ImportPayload } from '../state/reducer';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { DateField } from '../components/ui/Field';
import { CategoryArt } from '../components/pantry/CategoryArt';
import {
  ACCEPTED_FILE_TYPES, TEMPLATE_CSV, parseDelimitedText, planImport, readImportFile, rowsFromCells,
  type ImportMode, type PlannedRow, type RawImportRow,
} from '../lib/importFile';
import { findCategory } from '../lib/categories';
import { formatQty } from '../lib/format';
import { createId } from '../lib/id';
import { today } from '../lib/dates';
import { navigate } from '../lib/router';

const MODES: { value: ImportMode; title: string; text: string; icon: typeof PackagePlus }[] = [
  { value: 'bought', title: 'I just bought these', text: 'Quantities are added to what you already have.', icon: PackagePlus },
  { value: 'count', title: 'This is what I have now', text: 'Quantities replace what the app shows — use after counting your pantry.', icon: ClipboardList },
];

export function ImportPage({ query }: { query: URLSearchParams }) {
  const { data, dispatch } = useStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>(query.get('mode') === 'count' ? 'count' : 'bought');
  const [source, setSource] = useState<{ name: string; rows: RawImportRow[] } | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({});
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [tickShopping, setTickShopping] = useState(true);

  const plan = useMemo(() => (source ? planImport(source.rows, data, mode) : []), [source, data, mode]);
  const actionable = plan.filter((p) => p.action === 'new' || p.action === 'add' || p.action === 'set');
  const included = actionable.filter((p) => !excluded.has(p.line));
  const skipped = plan.filter((p) => p.action === 'skip');
  const unchanged = plan.filter((p) => p.action === 'same');

  const openShopping = useMemo(() => {
    if (mode !== 'bought') return [];
    const names = new Set(included.map((p) => p.name.toLowerCase()));
    const ids = new Set(included.map((p) => p.itemId).filter(Boolean));
    return data.shoppingList.filter(
      (s) => !s.isCompleted && ((s.linkedPantryItemId && ids.has(s.linkedPantryItemId)) || names.has(s.name.toLowerCase())),
    );
  }, [data.shoppingList, included, mode]);

  const load = (name: string, rows: RawImportRow[]) => {
    if (rows.length === 0) {
      setError('We could not find any items in that file. Each row needs at least an item name and a quantity.');
      return;
    }
    setSource({ name, rows });
    setExcluded(new Set());
    setCategoryOverrides({});
    setError(undefined);
  };

  const onFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setBusy(true);
    setError(undefined);
    try {
      load(file.name, rowsFromCells(await readImportFile(file)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That file could not be read.');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onFile(e.dataTransfer.files?.[0]);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pantry-power-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const apply = () => {
    if (!source || included.length === 0) return;
    const before = data;
    const newUnits: Unit[] = [];
    const unitFor = (p: PlannedRow): string => {
      if (p.unitId) return p.unitId;
      const label = p.newUnitLabel ?? 'piece';
      let unit = newUnits.find((u) => u.singular === label);
      if (!unit) {
        unit = { id: createId('unit'), singular: label, plural: label, isCustom: true };
        newUnits.push(unit);
      }
      return unit.id;
    };
    const payload: ImportPayload = {
      newUnits,
      newItems: [],
      changes: [],
      completeShoppingIds: tickShopping ? openShopping.map((s) => s.id) : [],
      note: `${mode === 'bought' ? 'Bought' : 'Stock count'} · from ${source.name}`.slice(0, 200),
    };
    for (const p of included) {
      if (p.action === 'new') {
        payload.newItems.push({
          id: createId('item'),
          input: {
            name: p.name,
            categoryId: categoryOverrides[p.line] ?? p.categoryId,
            quantity: p.quantity!,
            unit: unitFor(p),
            minimumStock: p.minimumStock ?? 0,
            expiryDate: p.expiryDate,
            purchaseDate: mode === 'bought' ? p.purchaseDate ?? (purchaseDate || null) : p.purchaseDate,
            storageLocation: p.storageLocation,
            image: null,
            notes: p.notes,
          },
        });
      } else if (p.itemId) {
        payload.changes.push({
          itemId: p.itemId,
          kind: p.action === 'add' ? 'add' : 'set',
          quantity: p.quantity!,
          expiryDate: p.expiryDate,
          minimumStock: p.minimumStock,
          purchaseDate: mode === 'bought' ? p.purchaseDate ?? (purchaseDate || null) : null,
        });
      }
    }
    dispatch({ type: 'import/apply', payload, at: new Date().toISOString() });
    toast({
      message: `Pantry updated: ${payload.newItems.length} new, ${payload.changes.length} updated`,
      action: { label: 'Undo', onClick: () => dispatch({ type: 'data/replace', data: before }) },
      duration: 10000,
    });
    navigate('/pantry', { replace: true });
  };

  return (
    <>
      <PageHeader back="/pantry" title="Import from a file" subtitle="Update your pantry from a spreadsheet, a market list or a receipt you typed up." />

      <section aria-label="What is in the file?" className="mb-6">
        <h2 className="section-title mb-3">1 · What is in the file?</h2>
        <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODES.map((m) => {
            const on = mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setMode(m.value)}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${on ? 'border-olive-600 bg-olive-50 ring-2 ring-olive-200' : 'border-line bg-white/70 hover:border-olive-300'}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-olive-600 text-ivory' : 'bg-cream text-stone-warm'}`}>
                  <m.icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-bold text-charcoal">{m.title}</span>
                  <span className="mt-0.5 block text-sm text-stone-warm">{m.text}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Choose your file" className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">2 · Choose your file</h2>
          <Button size="sm" variant="ghost" icon={Download} onClick={downloadTemplate}>
            Download a template
          </Button>
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-colors ${dragging ? 'border-olive-500 bg-olive-50' : 'border-line bg-white/60'}`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-olive-100 text-olive-600">
            <FileSpreadsheet className="h-7 w-7" aria-hidden />
          </span>
          {source ? (
            <p className="mt-3 font-bold text-charcoal">{source.name}</p>
          ) : (
            <p className="mt-3 font-bold text-charcoal">Excel (.xlsx), CSV or a text file</p>
          )}
          <p className="mt-1 max-w-md text-sm text-stone-warm">
            One item per row with a name and a quantity — for example <em>Rice, 25, kg</em>. Columns for unit, category, expiry date and where it's kept are optional.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button icon={Upload} onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? 'Reading…' : source ? 'Choose another file' : 'Choose file'}
            </Button>
            <Button variant="secondary" icon={ClipboardList} onClick={() => setPasteOpen((o) => !o)} aria-expanded={pasteOpen}>
              Paste a list
            </Button>
          </div>
          <input ref={fileRef} type="file" accept={ACCEPTED_FILE_TYPES} className="sr-only" tabIndex={-1} aria-label="Choose a spreadsheet or text file" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>

        {pasteOpen && (
          <div className="mt-3 rounded-2xl border border-line bg-white/70 p-4">
            <label htmlFor="paste-list" className="mb-1.5 block font-semibold text-charcoal">
              Paste your list
            </label>
            <textarea
              id="paste-list"
              rows={6}
              className="input font-mono text-sm"
              placeholder={'Rice - 25 kg\nVegetable oil 5 litres\nTomato paste x 12 tins'}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
            <p className="mt-1.5 text-sm text-stone-warm">Works with lists copied from WhatsApp, Notes or a spreadsheet.</p>
            <Button className="mt-3" icon={ArrowRight} disabled={!pasted.trim()} onClick={() => load('pasted list', rowsFromCells(parseDelimitedText(pasted)))}>
              Read list
            </Button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-danger-deep">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </section>

      {source && (
        <section aria-label="Check the changes">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">3 · Check the changes</h2>
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => setSource(null)}>
              Start again
            </Button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 text-sm font-semibold">
            <span className="rounded-full bg-olive-100 px-3 py-1.5 text-olive-700">{plan.filter((p) => p.action === 'new').length} new</span>
            <span className="rounded-full bg-cream px-3 py-1.5 text-charcoal">{plan.filter((p) => p.action === 'add' || p.action === 'set').length} to update</span>
            {unchanged.length > 0 && <span className="rounded-full bg-cream px-3 py-1.5 text-stone-warm">{unchanged.length} unchanged</span>}
            {skipped.length > 0 && <span className="rounded-full bg-danger-soft px-3 py-1.5 text-danger-deep">{skipped.length} need attention</span>}
          </div>

          <ul className="card divide-y divide-line/70">
            {plan.map((p) => (
              <PreviewRow
                key={p.line}
                row={p}
                included={!excluded.has(p.line)}
                onToggle={() =>
                  setExcluded((prev) => {
                    const next = new Set(prev);
                    if (next.has(p.line)) next.delete(p.line);
                    else next.add(p.line);
                    return next;
                  })
                }
                categoryId={categoryOverrides[p.line] ?? p.categoryId}
                onCategory={(id) => setCategoryOverrides((c) => ({ ...c, [p.line]: id }))}
              />
            ))}
          </ul>

          {mode === 'bought' && included.length > 0 && (
            <div className="mt-4 space-y-4 rounded-2xl border border-line bg-white/70 p-4">
              <DateField label="Date bought" value={purchaseDate} onChange={setPurchaseDate} max={today()} optional hint="Used for items whose row has no date of its own." />
              {openShopping.length > 0 && (
                <label className="flex min-h-12 cursor-pointer items-start gap-3">
                  <input type="checkbox" className="mt-1 h-5 w-5 accent-olive-600" checked={tickShopping} onChange={(e) => setTickShopping(e.target.checked)} />
                  <span>
                    <span className="flex items-center gap-1.5 font-semibold text-charcoal">
                      <ShoppingBasket className="h-4 w-4" aria-hidden /> Tick {openShopping.length} item{openShopping.length === 1 ? '' : 's'} off my shopping list
                    </span>
                    <span className="block text-sm text-stone-warm">{openShopping.map((s) => s.name).join(', ')}</span>
                  </span>
                </label>
              )}
            </div>
          )}

          <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-5 border-t border-line/70 bg-ivory/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border lg:bottom-4">
            <Button size="lg" block icon={PackageCheck} disabled={included.length === 0} onClick={apply}>
              {included.length === 0 ? 'Nothing to import' : `Update pantry · ${included.length} item${included.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </section>
      )}
    </>
  );
}

function PreviewRow({
  row, included, onToggle, categoryId, onCategory,
}: { row: PlannedRow; included: boolean; onToggle: () => void; categoryId: string; onCategory: (id: string) => void }) {
  const { data } = useStore();
  const category = findCategory(data.categories, categoryId);
  const unitId = row.unitId ?? row.newUnitLabel ?? 'piece';
  const fmt = (n: number) => formatQty(n, unitId, data.units);
  const canInclude = row.action === 'new' || row.action === 'add' || row.action === 'set';

  let summary: ReactNode;
  if (row.action === 'new') summary = <><span className="font-bold text-olive-700">New item</span> · {fmt(row.resultQuantity!)}</>;
  else if (row.action === 'add' || row.action === 'set')
    summary = (
      <span className="tabular">
        {fmt(row.currentQuantity!)} <ArrowRight className="inline h-3.5 w-3.5" aria-label="becomes" /> <strong className="text-charcoal">{fmt(row.resultQuantity!)}</strong>
        {row.action === 'add' && <span className="text-olive-700"> (+{fmt(row.quantity!)})</span>}
      </span>
    );
  else if (row.action === 'same') summary = <>Already {fmt(row.currentQuantity!)} — no change</>;
  else summary = <span className="font-semibold text-danger">{row.message}</span>;

  return (
    <li className={`flex flex-wrap items-center gap-3 px-3.5 py-3 sm:flex-nowrap sm:px-4 ${!included && canInclude ? 'opacity-55' : ''}`}>
      {canInclude ? (
        <input type="checkbox" className="h-5 w-5 shrink-0 accent-olive-600" checked={included} onChange={onToggle} aria-label={`Include ${row.name}`} />
      ) : (
        <span className="w-5 shrink-0 text-center text-xs font-bold text-stone-light" aria-hidden>
          {row.action === 'skip' ? '!' : '='}
        </span>
      )}
      <CategoryArt category={category} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-charcoal">
          {row.name || <span className="text-stone-light">Row {row.line}</span>}
          <span className="ml-2 text-xs font-semibold text-stone-light">row {row.line}</span>
        </p>
        <p className="text-sm text-stone-warm">{summary}</p>
        {row.action !== 'skip' && row.message && <p className="text-xs text-amber-deep">{row.message}</p>}
      </div>
      {row.action === 'new' && (
        <label className="w-full sm:w-48">
          <span className="sr-only">Category for {row.name}</span>
          <select className="input min-h-10 py-1.5 text-sm" value={categoryId} onChange={(e) => onCategory(e.target.value)}>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </li>
  );
}
