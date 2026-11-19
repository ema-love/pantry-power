import type { Category } from '../../types';
import { TONE_STYLES } from '../../lib/categories';
import { getCategoryIcon } from '../../lib/icons';

const SIZES = {
  sm: { box: 'h-11 w-11 rounded-xl', icon: 'h-5 w-5' },
  md: { box: 'h-16 w-16 rounded-2xl', icon: 'h-7 w-7' },
  lg: { box: 'h-28 w-28 rounded-3xl sm:h-32 sm:w-32', icon: 'h-12 w-12' },
};

/** Item photo when available, otherwise a soft category illustration. */
export function CategoryArt({ category, image, size = 'md', alt = '' }: { category: Category; image?: string | null; size?: keyof typeof SIZES; alt?: string }) {
  const s = SIZES[size];
  if (image) {
    return <img src={image} alt={alt} className={`${s.box} shrink-0 object-cover ring-1 ring-line`} loading="lazy" />;
  }
  const Icon = getCategoryIcon(category.icon);
  const tone = TONE_STYLES[category.tone];
  return (
    <div className={`${s.box} relative flex shrink-0 items-center justify-center overflow-hidden`} style={{ backgroundColor: tone.bg, color: tone.fg }} aria-hidden>
      <div className="absolute -bottom-3 -right-3 h-2/3 w-2/3 rounded-full opacity-40" style={{ backgroundColor: tone.fg, filter: 'blur(14px)' }} />
      <Icon className={`${s.icon} relative`} strokeWidth={1.7} />
    </div>
  );
}
