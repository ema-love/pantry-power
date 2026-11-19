import type { Unit } from '../types';

const u = (id: string, singular: string, plural = singular): Unit => ({ id, singular, plural, isCustom: false });

/** Units that make sense in everyday Nigerian households. */
export const DEFAULT_UNITS: Unit[] = [
  u('kg', 'kg'),
  u('g', 'g'),
  u('litre', 'litre', 'litres'),
  u('ml', 'ml'),
  u('bag', 'bag', 'bags'),
  u('carton', 'carton', 'cartons'),
  u('pack', 'pack', 'packs'),
  u('tin', 'tin', 'tins'),
  u('bottle', 'bottle', 'bottles'),
  u('sachet', 'sachet', 'sachets'),
  u('piece', 'piece', 'pieces'),
  u('jar', 'jar', 'jars'),
  u('crate', 'crate', 'crates'),
  u('tray', 'tray', 'trays'),
  u('tuber', 'tuber', 'tubers'),
  u('derica', 'derica', 'derica'),
  u('mudu', 'mudu', 'mudu'),
  u('paint', 'paint bucket', 'paint buckets'),
  u('gallon', 'gallon', 'gallons'),
  u('keg', 'keg', 'kegs'),
  u('loaf', 'loaf', 'loaves'),
  u('bunch', 'bunch', 'bunches'),
  u('basket', 'basket', 'baskets'),
];

export const DEFAULT_PREFERRED_UNITS = [
  'kg', 'g', 'litre', 'ml', 'bag', 'carton', 'pack', 'tin', 'bottle', 'sachet', 'piece',
  'jar', 'crate', 'tray', 'tuber', 'derica', 'mudu', 'paint', 'gallon', 'keg', 'loaf', 'bunch', 'basket',
];

export function findUnit(units: Unit[], id: string): Unit | undefined {
  return units.find((x) => x.id === id);
}

export function unitLabel(units: Unit[], id: string, quantity: number): string {
  const unit = findUnit(units, id);
  if (!unit) return id;
  return quantity === 1 ? unit.singular : unit.plural;
}
