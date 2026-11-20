import { describe, expect, it } from 'vitest';
import { parseDateCell, parseDelimitedText, planImport, rowsFromCells, matchUnit, TEMPLATE_CSV } from './importFile';
import { createEmptyData } from './sanitize';
import { reducer } from '../state/reducer';
import type { AppData } from '../types';

function pantry(): AppData {
  let s = createEmptyData();
  s = reducer(s, {
    type: 'item/add', id: 'rice', at: '2026-11-19T10:00:00.000Z',
    input: { name: 'Rice', categoryId: 'grains', quantity: 4, unit: 'kg', minimumStock: 5, expiryDate: null, purchaseDate: null, storageLocation: '', image: null, notes: '' },
  });
  return s;
}

describe('reading text files', () => {
  it('parses CSV with quotes and header in any order', () => {
    const rows = rowsFromCells(parseDelimitedText('Qty,Item,Unit\n"2,5",Palm oil,litres\n12,"Tomato paste, small",tins\n'));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: 'Palm oil', quantity: 2.5, unitText: 'litres' });
    expect(rows[1]).toMatchObject({ name: 'Tomato paste, small', quantity: 12 });
  });

  it('parses semicolon and tab separated files', () => {
    expect(rowsFromCells(parseDelimitedText('Item;Quantity\nBeans;10'))[0]).toMatchObject({ name: 'Beans', quantity: 10 });
    expect(rowsFromCells(parseDelimitedText('Item\tQuantity\tUnit\nGarri\t6\tkg'))[0]).toMatchObject({ name: 'Garri', quantity: 6, unitText: 'kg' });
  });

  it('understands plain lists, one item per line', () => {
    const rows = rowsFromCells(parseDelimitedText('Rice - 10 kg\n- Tomato paste x 12 tins\n2 tomato paste\n10kg of beans\nVegetable oil 5 litres\nSalt'));
    expect(rows.map((r) => [r.name, r.quantity, r.unitText])).toEqual([
      ['Rice', 10, 'kg'],
      ['Tomato paste', 12, 'tins'],
      ['tomato paste', 2, ''],
      ['beans', 10, 'kg'],
      ['Vegetable oil', 5, 'litres'],
      ['Salt', null, ''],
    ]);
    expect(rows[5].problems).toContain('No quantity');
  });

  it('reads quantity cells that include the unit', () => {
    const rows = rowsFromCells([['Item', 'Quantity'], ['Rice', '25 kg'], ['Milk', '1 carton']]);
    expect(rows[0]).toMatchObject({ quantity: 25, unitText: 'kg' });
    expect(rows[1]).toMatchObject({ quantity: 1, unitText: 'carton' });
  });

  it('parses the downloadable template', () => {
    const rows = rowsFromCells(parseDelimitedText(TEMPLATE_CSV));
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ name: 'Rice', quantity: 25, expiryDate: '2027-08-31', minimumStock: 5, storageLocation: 'Store room' });
    expect(rows.every((r) => r.problems.length === 0)).toBe(true);
  });
});

describe('dates and units', () => {
  it('reads day-first and ISO dates', () => {
    expect(parseDateCell('31/12/2026')).toBe('2026-12-31');
    expect(parseDateCell('2026-12-31')).toBe('2026-12-31');
    expect(parseDateCell('5 Jan 2027')).toBe('2027-01-05');
    expect(parseDateCell('31/02/2026')).toBe('invalid');
    expect(parseDateCell(new Date(Date.UTC(2027, 0, 5)))).toBe('2027-01-05');
    expect(parseDateCell(46387)).toBe('2026-12-31');
    expect(parseDateCell('')).toBeNull();
  });
  it('matches common unit spellings', () => {
    const { units } = createEmptyData();
    expect(matchUnit('Kgs', units)).toBe('kg');
    expect(matchUnit('ltrs', units)).toBe('litre');
    expect(matchUnit('pkts', units)).toBe('pack');
    expect(matchUnit('Paint buckets', units)).toBe('paint');
    expect(matchUnit('bowls', units)).toBeNull();
  });
});

describe('planning and applying an import', () => {
  const rows = () => rowsFromCells([
    ['Item', 'Quantity', 'Unit', 'Expiry'],
    ['rice', 10, 'kg', '01/06/2027'],
    ['Plantain', 2, 'bunches', ''],
    ['Rice', 1, 'kg', ''],
    ['Bad', 'lots', '', ''],
    ['Crayfish', 3, 'bowls', ''],
  ]);

  it('adds bought quantities to existing items and creates new ones', () => {
    const plan = planImport(rows(), pantry(), 'bought');
    expect(plan.map((p) => p.action)).toEqual(['add', 'new', 'skip', 'skip', 'new']);
    expect(plan[0]).toMatchObject({ itemId: 'rice', currentQuantity: 4, resultQuantity: 14 });
    expect(plan[1]).toMatchObject({ categoryId: 'produce', unitId: 'bunch' });
    expect(plan[4]).toMatchObject({ unitId: null, newUnitLabel: 'bowls' });
  });

  it('sets totals in stock-count mode', () => {
    const plan = planImport(rows(), pantry(), 'count');
    expect(plan[0]).toMatchObject({ action: 'set', resultQuantity: 10 });
  });

  it('skips rows whose unit does not match the pantry item', () => {
    const plan = planImport(rowsFromCells([['Item', 'Qty', 'Unit'], ['Rice', 1, 'bag']]), pantry(), 'bought');
    expect(plan[0].action).toBe('skip');
    expect(plan[0].message).toMatch(/counts Rice in kg/);
  });

  it('applies changes atomically, records history and ticks off the shopping list', () => {
    let s = pantry();
    s = reducer(s, { type: 'shopping/add', at: 'x', items: [{ id: 'e1', name: 'Rice', categoryId: 'grains', quantity: 10, unit: 'kg', notes: '', linkedPantryItemId: 'rice' }] });
    s = reducer(s, {
      type: 'import/apply', at: '2026-11-20T10:00:00.000Z',
      payload: {
        newUnits: [{ id: 'unit_bowl', singular: 'bowls', plural: 'bowls', isCustom: true }],
        newItems: [{ id: 'cray', input: { name: 'Crayfish', categoryId: 'spices', quantity: 3, unit: 'unit_bowl', minimumStock: 0, expiryDate: null, purchaseDate: null, storageLocation: '', image: null, notes: '' } }],
        changes: [{ itemId: 'rice', kind: 'add', quantity: 10, expiryDate: '2027-06-01', minimumStock: null, purchaseDate: null }],
        completeShoppingIds: ['e1'],
        note: 'Imported from purchases.csv',
      },
    });
    const rice = s.items.find((i) => i.id === 'rice')!;
    expect(rice).toMatchObject({ quantity: 14, expiryDate: '2027-06-01', purchaseDate: '2026-11-20' });
    expect(s.items.find((i) => i.id === 'cray')?.quantity).toBe(3);
    expect(s.units.some((u) => u.id === 'unit_bowl')).toBe(true);
    expect(s.settings.preferredUnits).toContain('unit_bowl');
    expect(s.transactions.filter((t) => t.notes === 'Imported from purchases.csv')).toHaveLength(2);
    expect(s.shoppingList[0]).toMatchObject({ isCompleted: true });
    expect(s.shoppingList[0].restockedAt).not.toBeNull();
  });
});
