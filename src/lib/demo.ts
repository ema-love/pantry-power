import type { AppData, MarketTrip, PantryItem, ShoppingListItem, StockTransaction } from '../types';
import { addDays, today } from './dates';
import { createId } from './id';

interface DemoSpec {
  name: string;
  categoryId: string;
  quantity: number;
  unit: string;
  minimumStock: number;
  expiresIn?: number;
  boughtAgo?: number;
  location: string;
  notes?: string;
}

const SPECS: DemoSpec[] = [
  { name: 'Rice', categoryId: 'grains', quantity: 18, unit: 'kg', minimumStock: 5, expiresIn: 300, boughtAgo: 12, location: 'Store room', notes: 'Long grain parboiled, 50 kg bag split into buckets.' },
  { name: 'Beans', categoryId: 'legumes', quantity: 3, unit: 'kg', minimumStock: 3, expiresIn: 200, boughtAgo: 40, location: 'Pantry shelf', notes: 'Oloyin (honey beans).' },
  { name: 'Garri', categoryId: 'flour', quantity: 6, unit: 'kg', minimumStock: 2, expiresIn: 120, boughtAgo: 20, location: 'Pantry shelf', notes: 'Yellow garri.' },
  { name: 'Semolina', categoryId: 'flour', quantity: 1, unit: 'kg', minimumStock: 2, expiresIn: 90, boughtAgo: 35, location: 'Kitchen cabinet' },
  { name: 'Wheat flour', categoryId: 'flour', quantity: 2, unit: 'kg', minimumStock: 1, expiresIn: 25, boughtAgo: 50, location: 'Kitchen cabinet' },
  { name: 'Spaghetti', categoryId: 'pasta', quantity: 10, unit: 'pack', minimumStock: 4, expiresIn: 240, boughtAgo: 12, location: 'Pantry shelf' },
  { name: 'Macaroni', categoryId: 'pasta', quantity: 0, unit: 'pack', minimumStock: 2, location: 'Pantry shelf' },
  { name: 'Vegetable oil', categoryId: 'oils', quantity: 4, unit: 'litre', minimumStock: 2, expiresIn: 180, boughtAgo: 12, location: 'Kitchen cabinet' },
  { name: 'Palm oil', categoryId: 'oils', quantity: 1, unit: 'litre', minimumStock: 1, expiresIn: 100, boughtAgo: 30, location: 'Kitchen cabinet' },
  { name: 'Tomato paste', categoryId: 'canned', quantity: 12, unit: 'tin', minimumStock: 4, expiresIn: 5, boughtAgo: 60, location: 'Pantry shelf', notes: 'Use the older tins first.' },
  { name: 'Seasoning cubes', categoryId: 'spices', quantity: 2, unit: 'pack', minimumStock: 1, expiresIn: 150, boughtAgo: 12, location: 'Kitchen cabinet' },
  { name: 'Salt', categoryId: 'spices', quantity: 1, unit: 'pack', minimumStock: 1, location: 'Kitchen cabinet' },
  { name: 'Sugar', categoryId: 'baking', quantity: 2, unit: 'pack', minimumStock: 1, location: 'Kitchen cabinet' },
  { name: 'Milk', categoryId: 'dairy', quantity: 1, unit: 'carton', minimumStock: 1, expiresIn: -2, boughtAgo: 70, location: 'Pantry shelf', notes: 'Evaporated milk, 48 tins per carton.' },
  { name: 'Tea', categoryId: 'beverages', quantity: 3, unit: 'pack', minimumStock: 1, expiresIn: 400, boughtAgo: 12, location: 'Kitchen cabinet' },
  { name: 'Cereal', categoryId: 'breakfast', quantity: 1, unit: 'pack', minimumStock: 2, expiresIn: 14, boughtAgo: 40, location: 'Kitchen cabinet' },
  { name: 'Sardines', categoryId: 'canned', quantity: 8, unit: 'tin', minimumStock: 3, expiresIn: 365, boughtAgo: 12, location: 'Pantry shelf' },
  { name: 'Groundnut', categoryId: 'legumes', quantity: 0, unit: 'derica', minimumStock: 1, location: 'Pantry shelf' },
  { name: 'Dry pepper', categoryId: 'spices', quantity: 2, unit: 'derica', minimumStock: 1, expiresIn: 60, boughtAgo: 12, location: 'Kitchen cabinet' },
  { name: 'Onions', categoryId: 'produce', quantity: 1.5, unit: 'kg', minimumStock: 1, expiresIn: 9, boughtAgo: 5, location: 'Countertop basket' },
];

/** Build realistic Nigerian household demo data, with dates relative to today. */
export function buildDemoData(): Pick<AppData, 'items' | 'transactions' | 'shoppingList' | 'trips'> {
  const now = today();
  const nowIso = new Date().toISOString();
  const items: PantryItem[] = SPECS.map((s) => ({
    id: createId('item'),
    name: s.name,
    categoryId: s.categoryId,
    quantity: s.quantity,
    unit: s.unit,
    minimumStock: s.minimumStock,
    expiryDate: s.expiresIn === undefined ? null : addDays(now, s.expiresIn),
    purchaseDate: s.boughtAgo === undefined ? null : addDays(now, -s.boughtAgo),
    storageLocation: s.location,
    image: null,
    notes: s.notes ?? '',
    createdAt: nowIso,
    updatedAt: nowIso,
    isDemo: true,
  }));

  const byName = (name: string) => items.find((i) => i.name === name)!;
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const tx = (name: string, type: StockTransaction['transactionType'], amount: number, h: number, notes = ''): StockTransaction => {
    const item = byName(name);
    const delta = type === 'consumption' ? -amount : amount;
    return {
      id: createId('tx'),
      itemId: item.id,
      itemName: item.name,
      transactionType: type,
      quantity: amount,
      delta,
      unit: item.unit,
      balanceAfter: item.quantity,
      date: hoursAgo(h),
      notes,
      isDemo: true,
    };
  };
  const transactions: StockTransaction[] = [
    tx('Rice', 'consumption', 2, 3, 'Jollof for Sunday lunch'),
    tx('Beans', 'consumption', 1, 20),
    tx('Spaghetti', 'addition', 6, 30, 'Bought at Mile 12'),
    tx('Macaroni', 'consumption', 1, 50),
    tx('Vegetable oil', 'addition', 5, 70),
  ];

  const shop = (name: string, categoryId: string, quantity: number, unit: string, notes = '', linked?: string): ShoppingListItem => ({
    id: createId('shop'),
    name,
    categoryId,
    quantity,
    unit,
    notes,
    isCompleted: false,
    linkedPantryItemId: linked ? byName(linked).id : null,
    createdAt: nowIso,
    completedAt: null,
    restockedAt: null,
    isDemo: true,
  });
  const shoppingList: ShoppingListItem[] = [
    shop('Macaroni', 'pasta', 6, 'pack', '', 'Macaroni'),
    shop('Groundnut', 'legumes', 2, 'derica', 'Raw, not roasted', 'Groundnut'),
    shop('Semolina', 'flour', 5, 'kg', '', 'Semolina'),
    shop('Curry powder', 'spices', 2, 'sachet'),
    shop('Thyme', 'spices', 1, 'sachet'),
  ];

  const trips: MarketTrip[] = [
    {
      id: createId('trip'),
      title: 'Saturday market run',
      shoppingListItems: shoppingList.map((s) => s.id),
      plannedDate: addDays(now, 2),
      reminderEnabled: true,
      notes: 'Go early before the crowd. Bring the big cooler bag.',
      status: 'planned',
      createdAt: nowIso,
      completedAt: null,
      itemsSnapshot: null,
      notifiedOn: [],
      isDemo: true,
    },
  ];

  return { items, transactions, shoppingList, trips };
}

export function hasDemoData(data: AppData): boolean {
  return (
    data.items.some((x) => x.isDemo) ||
    data.shoppingList.some((x) => x.isDemo) ||
    data.trips.some((x) => x.isDemo)
  );
}
