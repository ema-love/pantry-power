import type { Category, CategoryTone } from '../types';

const c = (id: string, name: string, icon: string, tone: CategoryTone): Category => ({ id, name, icon, tone, isCustom: false });

export const OTHER_CATEGORY_ID = 'other';

export const DEFAULT_CATEGORIES: Category[] = [
  c('grains', 'Grains & Rice', 'wheat', 'wheat'),
  c('legumes', 'Beans & Legumes', 'bean', 'clay'),
  c('flour', 'Flour & Swallow', 'cookingPot', 'amber'),
  c('pasta', 'Pasta & Noodles', 'soup', 'terracotta'),
  c('oils', 'Oils', 'droplet', 'amber'),
  c('spices', 'Spices & Seasoning', 'flame', 'terracotta'),
  c('canned', 'Canned & Packaged', 'package', 'clay'),
  c('beverages', 'Beverages', 'coffee', 'plum'),
  c('dairy', 'Dairy & Eggs', 'milk', 'sky'),
  c('breakfast', 'Breakfast & Cereal', 'croissant', 'wheat'),
  c('baking', 'Sugar & Baking', 'cake', 'plum'),
  c('produce', 'Fresh Produce', 'carrot', 'olive'),
  c('protein', 'Meat & Fish', 'fish', 'sky'),
  c('frozen', 'Frozen', 'snowflake', 'sky'),
  c('snacks', 'Snacks', 'cookie', 'terracotta'),
  c(OTHER_CATEGORY_ID, 'Other', 'box', 'sage'),
];

export const TONES: CategoryTone[] = ['olive', 'sage', 'terracotta', 'amber', 'clay', 'wheat', 'sky', 'plum'];

/** Background / foreground pairs for category illustrations. */
export const TONE_STYLES: Record<CategoryTone, { bg: string; fg: string }> = {
  olive: { bg: '#E4E9DC', fg: '#465B3D' },
  sage: { bg: '#E8EDE2', fg: '#5E7550' },
  terracotta: { bg: '#F4E3D9', fg: '#9E6147' },
  amber: { bg: '#F6EBD3', fg: '#8A6420' },
  clay: { bg: '#EEE3DA', fg: '#7A5A45' },
  wheat: { bg: '#F3ECDA', fg: '#7D6A3A' },
  sky: { bg: '#E2EAEA', fg: '#476768' },
  plum: { bg: '#EDE2E4', fg: '#7A4F58' },
};

export function findCategory(categories: Category[], id: string): Category {
  return (
    categories.find((x) => x.id === id) ??
    categories.find((x) => x.id === OTHER_CATEGORY_ID) ??
    DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]
  );
}
