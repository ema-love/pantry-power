import {
  Apple, Bean, Beef, Box, CakeSlice, Candy, Carrot, Cherry, Coffee, Cookie, CookingPot, Croissant,
  Droplet, Egg, Fish, Flame, GlassWater, Leaf, Milk, Nut, Package, Pizza, Salad, Sandwich, Snowflake,
  Soup, Sprout, Wheat, Wine, type LucideIcon,
} from 'lucide-react';

/** Curated icon set for categories. Keys are persisted, so never rename them. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  wheat: Wheat,
  bean: Bean,
  cookingPot: CookingPot,
  soup: Soup,
  droplet: Droplet,
  flame: Flame,
  package: Package,
  coffee: Coffee,
  milk: Milk,
  egg: Egg,
  croissant: Croissant,
  cake: CakeSlice,
  carrot: Carrot,
  fish: Fish,
  beef: Beef,
  snowflake: Snowflake,
  cookie: Cookie,
  box: Box,
  apple: Apple,
  cherry: Cherry,
  nut: Nut,
  leaf: Leaf,
  sprout: Sprout,
  salad: Salad,
  sandwich: Sandwich,
  pizza: Pizza,
  candy: Candy,
  water: GlassWater,
  wine: Wine,
};

export const CUSTOM_ICON_CHOICES = Object.keys(CATEGORY_ICONS);

export function getCategoryIcon(key: string): LucideIcon {
  return CATEGORY_ICONS[key] ?? Box;
}
