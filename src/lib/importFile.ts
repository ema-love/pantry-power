/**
 * Turning a spreadsheet or text file into pantry rows.
 *
 * Supported: .xlsx (Excel / Google Sheets download), .csv, .tsv, .txt.
 * The first row may be a header (Item, Quantity, Unit, Category, Expiry, …) in any order.
 * Without a header, columns are read as: item, quantity, unit, category, expiry date.
 * A quantity cell may also hold the unit, e.g. "25 kg" or "12 tins".
 */
import type { AppData, Unit } from '../types';
import { lookupCatalog } from './catalog';
import { OTHER_CATEGORY_ID } from './categories';
import { isValidDateOnly, toDateOnly } from './dates';
import { MAX_NAME_LENGTH, MAX_QUANTITY } from './validation';
import { DEFAULT_UNITS } from './units';

export type Cell = string | number | boolean | Date | null | undefined;
export type ImportMode = 'bought' | 'count';

export const ACCEPTED_FILE_TYPES = '.xlsx,.csv,.tsv,.txt,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_ROWS = 500;

/* ---------------------------------- reading files ---------------------------------- */

export async function readImportFile(file: File): Promise<Cell[][]> {
  const name = file.name.toLowerCase();
  if (file.size > 5 * 1024 * 1024) throw new Error('That file is too large. Please use a file under 5 MB.');
  if (name.endsWith('.xls')) {
    throw new Error('Old Excel files (.xls) are not supported. In Excel, use "Save As" and choose .xlsx or .csv.');
  }
  if (name.endsWith('.xlsx')) {
    try {
      const { readSheet } = await import('read-excel-file/browser');
      return (await readSheet(file)) as unknown as Cell[][];
    } catch {
      throw new Error('That Excel file could not be opened. Try saving it again as .xlsx or .csv.');
    }
  }
  if (/\.(csv|tsv|txt)$/.test(name) || file.type.startsWith('text/') || file.type === '') {
    return parseDelimitedText(await file.text());
  }
  throw new Error('Please choose a spreadsheet (.xlsx or .csv) or a text file (.txt).');
}

/** Minimal CSV/TSV parser with quote support. Picks the delimiter from the first line. */
export function parseDelimitedText(text: string): Cell[][] {
  const clean = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const firstLine = clean.split('\n').find((l) => l.trim()) ?? '';
  const delimiter = ['\t', ';', ','].reduce(
    (best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best),
    ',',
  );
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"' && field === '') inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  // A plain list with one item per line ("Rice 10 kg") has a single column; split it into parts.
  return rows
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => (r.length === 1 && delimiter !== '\t' ? splitFreeText(r[0]) : r));
}

/** "Rice - 10 kg" / "10kg rice" / "Tomato paste x 12 tins" / "2 tomato paste" → [name, "quantity unit"] */
function splitFreeText(line: string): string[] {
  const text = line.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, '');
  const trailing = /^(.*?)(?:\s*[:,\-–]\s*|\s+[x×]\s*|\s+)(\d+(?:[.,]\d+)?)\s*([a-zA-Z][a-zA-Z ]*?)?\.?$/.exec(text);
  if (trailing && trailing[1].trim() && (!trailing[3] || isUnitWord(trailing[3]))) {
    return [trailing[1].trim(), `${trailing[2]} ${trailing[3] ?? ''}`.trim()];
  }
  const leading = /^(\d+(?:[.,]\d+)?)\s*(.+)$/.exec(text);
  if (leading) {
    const rest = leading[2].trim();
    // "10 kg rice" / "10kg of rice" — the first word is a unit only if we recognise it.
    const unitFirst = /^([a-zA-Z]+)\.?\s+(?:of\s+)?(.+)$/.exec(rest);
    if (unitFirst && isUnitWord(unitFirst[1])) return [unitFirst[2].trim(), `${leading[1]} ${unitFirst[1]}`];
    return [rest.replace(/^of\s+/i, ''), leading[1]];
  }
  return [text];
}

const UNIT_WORDS = new Set<string>();
function isUnitWord(word: string): boolean {
  if (UNIT_WORDS.size === 0) {
    for (const u of DEFAULT_UNITS) {
      UNIT_WORDS.add(u.id);
      UNIT_WORDS.add(u.singular.toLowerCase());
      UNIT_WORDS.add(u.plural.toLowerCase());
    }
    for (const k of Object.keys(UNIT_ALIASES)) UNIT_WORDS.add(k);
  }
  return UNIT_WORDS.has(word.trim().toLowerCase().replace(/\.$/, ''));
}

/* ---------------------------------- understanding rows ---------------------------------- */

type Field = 'name' | 'quantity' | 'unit' | 'category' | 'expiry' | 'minimum' | 'location' | 'notes' | 'purchased';

const HEADER_WORDS: Record<Field, string[]> = {
  name: ['item', 'items', 'name', 'item name', 'product', 'description', 'food', 'goods', 'what'],
  quantity: ['quantity', 'qty', 'amount', 'count', 'number', 'no', 'how many', 'how much', 'stock', 'quantity bought'],
  unit: ['unit', 'units', 'measure', 'measurement', 'uom', 'size'],
  category: ['category', 'type', 'group', 'section'],
  expiry: ['expiry', 'expiry date', 'expires', 'expiration', 'expiration date', 'best before', 'use by', 'exp'],
  minimum: ['minimum', 'min', 'minimum stock', 'min stock', 'warn at', 'warn me at', 'warn me when it gets down to', 'minimum level', 'reorder level', 'low level', 'threshold'],
  location: ['location', 'storage', 'stored', 'where', 'kept in', 'storage location', 'where it is kept', 'where kept', 'kept'],
  notes: ['notes', 'note', 'comment', 'comments', 'remarks'],
  purchased: ['purchase date', 'bought', 'date bought', 'purchased', 'bought on', 'date'],
};

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

function detectHeader(row: Cell[]): Partial<Record<Field, number>> | null {
  const map: Partial<Record<Field, number>> = {};
  const texts = row.map((cell) => (typeof cell === 'string' ? normalise(cell) : ''));
  // Exact matches first, then headers that start with a known word ("Quantity (kg)", "Expiry date dd/mm").
  for (const loose of [false, true]) {
    texts.forEach((text, i) => {
      if (!text || Object.values(map).includes(i)) return;
      for (const field of Object.keys(HEADER_WORDS) as Field[]) {
        if (map[field] !== undefined) continue;
        const hit = HEADER_WORDS[field].some((w) => (loose ? w.length >= 3 && text.startsWith(`${w} `) : w === text));
        if (hit) {
          map[field] = i;
          return;
        }
      }
    });
  }
  return map.name !== undefined ? map : null;
}

const UNIT_ALIASES: Record<string, string> = {
  kilo: 'kg', kilos: 'kg', kgs: 'kg', kilogram: 'kg', kilograms: 'kg', kilogramme: 'kg',
  gram: 'g', grams: 'g', gm: 'g', gms: 'g', gr: 'g',
  l: 'litre', ltr: 'litre', ltrs: 'litre', liter: 'litre', liters: 'litre', litres: 'litre', lt: 'litre',
  millilitre: 'ml', milliliter: 'ml', millilitres: 'ml', milliliters: 'ml',
  pc: 'piece', pcs: 'piece', pieces: 'piece', piece: 'piece', unit: 'piece', units: 'piece', each: 'piece',
  pkt: 'pack', pkts: 'pack', packet: 'pack', packets: 'pack', pk: 'pack', packs: 'pack',
  ctn: 'carton', ctns: 'carton', cartons: 'carton', box: 'carton', boxes: 'carton',
  tins: 'tin', can: 'tin', cans: 'tin',
  btl: 'bottle', btls: 'bottle', bottles: 'bottle',
  bags: 'bag', sack: 'bag', sacks: 'bag',
  sachets: 'sachet', satchet: 'sachet', satchets: 'sachet',
  jars: 'jar', crates: 'crate', trays: 'tray', tubers: 'tuber', loaves: 'loaf',
  bunches: 'bunch', baskets: 'basket', gallons: 'gallon', kegs: 'keg', 'paint buckets': 'paint', 'paint bucket': 'paint', bucket: 'paint', buckets: 'paint',
  dericas: 'derica', mudus: 'mudu',
};

/** Find a unit by id, label or common spelling. Returns null if unknown. */
export function matchUnit(raw: string, units: Unit[]): string | null {
  const text = raw.trim().toLowerCase().replace(/\.$/, '');
  if (!text) return null;
  const direct = units.find((u) => u.id === text || u.singular.toLowerCase() === text || u.plural.toLowerCase() === text);
  if (direct) return direct.id;
  const alias = UNIT_ALIASES[text];
  return alias && units.some((u) => u.id === alias) ? alias : null;
}

function cellText(c: Cell): string {
  if (c === null || c === undefined) return '';
  if (c instanceof Date) return toDateOnly(c);
  return String(c).trim();
}

function parseNumber(c: Cell): number | null {
  if (typeof c === 'number') return Number.isFinite(c) ? c : null;
  const text = cellText(c).replace(/,(?=\d{3}\b)/g, '').replace(',', '.');
  if (!/^-?\d*\.?\d+$/.test(text)) return null;
  return Number(text);
}

/** Excel stores dates as day numbers since 1899-12-30 when a cell isn't formatted as a date. */
function excelSerialToDate(n: number): string | null {
  if (n < 20000 || n > 80000) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + n * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Accepts 2026-12-31, 31/12/2026, 31-12-26, 31 Dec 2026, Excel dates. Day comes first, as in Nigeria. */
export function parseDateCell(c: Cell): string | null | 'invalid' {
  if (c === null || c === undefined || cellText(c) === '') return null;
  if (c instanceof Date) {
    // Excel dates arrive as UTC midnight.
    const iso = `${c.getUTCFullYear()}-${String(c.getUTCMonth() + 1).padStart(2, '0')}-${String(c.getUTCDate()).padStart(2, '0')}`;
    return isValidDateOnly(iso) ? iso : 'invalid';
  }
  if (typeof c === 'number') return excelSerialToDate(c) ?? 'invalid';
  const text = cellText(c).toLowerCase();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  if (m) return finish(m[1], m[2], m[3]);
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(text);
  if (m) return finish(m[3], m[2], m[1]);
  m = /^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]{3})[a-z]*\.?[\s,-]+(\d{2,4})$/.exec(text);
  if (m && MONTHS.includes(m[2])) return finish(m[3], String(MONTHS.indexOf(m[2]) + 1), m[1]);
  return 'invalid';

  function finish(y: string, mo: string, d: string) {
    const year = y.length === 2 ? `20${y}` : y;
    const iso = `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    return isValidDateOnly(iso) ? iso : 'invalid';
  }
}

export interface RawImportRow {
  line: number;
  name: string;
  quantity: number | null;
  unitText: string;
  categoryText: string;
  expiryDate: string | null;
  minimumStock: number | null;
  storageLocation: string;
  notes: string;
  purchaseDate: string | null;
  problems: string[];
}

export function rowsFromCells(cells: Cell[][]): RawImportRow[] {
  const nonEmpty = cells.filter((r) => r.some((c) => cellText(c) !== ''));
  if (nonEmpty.length === 0) return [];
  const header = detectHeader(nonEmpty[0]);
  const columns: Partial<Record<Field, number>> = header ?? { name: 0, quantity: 1, unit: 2, category: 3, expiry: 4 };
  const body = (header ? nonEmpty.slice(1) : nonEmpty).slice(0, MAX_ROWS);
  const at = (row: Cell[], f: Field): Cell => (columns[f] === undefined ? null : row[columns[f]!]);

  return body.map((row, i) => {
    const problems: string[] = [];
    const name = cellText(at(row, 'name')).replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
    let unitText = cellText(at(row, 'unit'));
    let quantity = parseNumber(at(row, 'quantity'));
    const qtyText = cellText(at(row, 'quantity'));
    if (quantity === null && qtyText) {
      // "25 kg", "12tins", "2.5 litres"
      const m = /^(\d+(?:[.,]\d+)?)\s*([a-zA-Z][a-zA-Z .]*)$/.exec(qtyText);
      if (m) {
        quantity = Number(m[1].replace(',', '.'));
        if (!unitText) unitText = m[2].trim();
      }
    }
    if (!name) problems.push('No item name');
    if (quantity === null) problems.push(qtyText ? `"${qtyText}" is not a quantity` : 'No quantity');
    else if (quantity < 0) problems.push('Quantity cannot be negative');
    else if (quantity > MAX_QUANTITY) problems.push('Quantity is too large');

    const minRaw = at(row, 'minimum');
    const minimumStock = cellText(minRaw) ? parseNumber(minRaw) : null;
    if (cellText(minRaw) && (minimumStock === null || minimumStock < 0)) problems.push('Minimum stock is not a valid number');

    const expiry = parseDateCell(at(row, 'expiry'));
    if (expiry === 'invalid') problems.push(`Expiry "${cellText(at(row, 'expiry'))}" is not a date`);
    const purchased = parseDateCell(at(row, 'purchased'));

    return {
      line: i + (header ? 2 : 1),
      name,
      quantity: quantity === null ? null : Math.round(quantity * 100) / 100,
      unitText,
      categoryText: cellText(at(row, 'category')),
      expiryDate: expiry === 'invalid' ? null : expiry,
      minimumStock: minimumStock === null || minimumStock < 0 ? null : Math.round(minimumStock * 100) / 100,
      storageLocation: cellText(at(row, 'location')).slice(0, 60),
      notes: cellText(at(row, 'notes')).slice(0, 500),
      purchaseDate: purchased === 'invalid' ? null : purchased,
      problems,
    };
  });
}

/* ---------------------------------- planning changes ---------------------------------- */

export type PlanAction = 'new' | 'add' | 'set' | 'same' | 'skip';

export interface PlannedRow extends RawImportRow {
  action: PlanAction;
  /** Why a row is skipped, or a gentle note about it. */
  message: string;
  itemId: string | null;
  unitId: string | null;
  /** A unit that doesn't exist yet and will be created. */
  newUnitLabel: string | null;
  categoryId: string;
  currentQuantity: number | null;
  resultQuantity: number | null;
}

export function planImport(rows: RawImportRow[], data: AppData, mode: ImportMode): PlannedRow[] {
  const byName = new Map(data.items.map((i) => [i.name.toLowerCase(), i]));
  const seen = new Set<string>();

  return rows.map((row) => {
    const base = { ...row, itemId: null, unitId: null, newUnitLabel: null, categoryId: OTHER_CATEGORY_ID, currentQuantity: null, resultQuantity: null };
    if (row.problems.length && (row.quantity === null || !row.name || row.quantity < 0 || row.quantity > MAX_QUANTITY)) {
      return { ...base, action: 'skip' as const, message: row.problems.join('. ') };
    }
    const key = row.name.toLowerCase();
    if (seen.has(key)) return { ...base, action: 'skip' as const, message: `${row.name} appears more than once in the file — only the first row is used` };
    seen.add(key);

    const existing = byName.get(key);
    const catalog = lookupCatalog(row.name);
    let unitId = row.unitText ? matchUnit(row.unitText, data.units) : null;
    const newUnitLabel = row.unitText && !unitId ? row.unitText.toLowerCase().slice(0, 24) : null;
    if (!row.unitText) unitId = existing?.unit ?? catalog?.unit ?? 'piece';

    const categoryMatch = row.categoryText
      ? data.categories.find((c) => c.name.toLowerCase() === row.categoryText.toLowerCase() || c.id === row.categoryText.toLowerCase())
      : undefined;
    const categoryId = existing?.categoryId ?? categoryMatch?.id ?? catalog?.categoryId ?? OTHER_CATEGORY_ID;
    const qty = row.quantity!;

    if (existing) {
      if (unitId !== existing.unit) {
        const label = data.units.find((u) => u.id === existing.unit)?.plural ?? existing.unit;
        return {
          ...base, categoryId, unitId, newUnitLabel, itemId: existing.id, currentQuantity: existing.quantity,
          action: 'skip' as const,
          message: `Your pantry counts ${existing.name} in ${label}, but the file says "${row.unitText}". Change one so they match.`,
        };
      }
      const result = mode === 'bought' ? Math.round((existing.quantity + qty) * 100) / 100 : qty;
      if (mode === 'bought' && qty === 0) {
        return { ...base, categoryId, unitId, itemId: existing.id, currentQuantity: existing.quantity, resultQuantity: existing.quantity, action: 'skip' as const, message: 'Quantity is 0, nothing to add' };
      }
      return {
        ...base, categoryId, unitId, itemId: existing.id, currentQuantity: existing.quantity, resultQuantity: result,
        action: mode === 'bought' ? ('add' as const) : result === existing.quantity ? ('same' as const) : ('set' as const),
        message: row.problems.join('. '),
      };
    }

    return {
      ...base, categoryId, unitId, newUnitLabel, currentQuantity: null, resultQuantity: qty,
      action: 'new' as const,
      message: [row.problems.join('. '), newUnitLabel ? `New unit "${newUnitLabel}" will be added` : ''].filter(Boolean).join('. '),
    };
  });
}

/** A template households can fill in, in Excel, Google Sheets or WhatsApp-to-CSV. */
export const TEMPLATE_CSV = [
  'Item,Quantity,Unit,Category,Expiry date,Warn me at,Where it is kept,Notes',
  'Rice,25,kg,Grains & Rice,31/08/2027,5,Store room,50 kg bag split in two',
  'Vegetable oil,5,litres,Oils,,2,Kitchen cabinet,',
  'Tomato paste,12,tins,Canned & Packaged,15/03/2027,4,Pantry shelf,',
  'Spaghetti,10,packs,Pasta & Noodles,,4,Pantry shelf,',
].join('\n');
