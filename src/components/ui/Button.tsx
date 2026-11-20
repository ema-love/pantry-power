import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { noteLinkNavigation } from '../../lib/router';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-olive-600 text-ivory hover:bg-olive-700 active:bg-olive-800 shadow-sm',
  secondary: 'border border-line bg-white text-charcoal hover:border-olive-300 hover:bg-olive-50 active:bg-olive-100',
  ghost: 'text-olive-700 hover:bg-olive-50 active:bg-olive-100',
  danger: 'bg-danger text-white hover:bg-danger-deep shadow-sm',
  accent: 'bg-terracotta text-white hover:bg-terracotta-600 active:bg-terracotta-700 shadow-sm',
  subtle: 'bg-cream text-charcoal hover:bg-cream-dark',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-3 text-sm gap-1.5 rounded-xl',
  md: 'min-h-12 px-4 text-[0.95rem] gap-2 rounded-xl',
  lg: 'min-h-14 px-5 text-base gap-2 rounded-2xl',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = ''): string {
  return `inline-flex items-center justify-center font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  block?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, CommonProps & ButtonHTMLAttributes<HTMLButtonElement>>(function Button(
  { variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, block, className = '', children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClasses(variant, size, `${block ? 'w-full' : ''} ${className}`)} {...rest}>
      {Icon && <Icon aria-hidden className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={2.2} />}
      {children}
      {IconRight && <IconRight aria-hidden className="h-4 w-4" strokeWidth={2.2} />}
    </button>
  );
});

export function ButtonLink({
  to, variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, block, className = '', children, ...rest
}: CommonProps & { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <a
      href={`#${to}`}
      onClick={noteLinkNavigation}
      className={buttonClasses(variant, size, `${block ? 'w-full' : ''} ${className}`)}
      {...rest}
    >
      {Icon && <Icon aria-hidden className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={2.2} />}
      {children}
      {IconRight && <IconRight aria-hidden className="h-4 w-4" strokeWidth={2.2} />}
    </a>
  );
}

export function IconButton({
  icon: Icon, label, className = '', variant = 'ghost', ...rest
}: { icon: LucideIcon; label: string; variant?: ButtonVariant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      <Icon aria-hidden className="h-5 w-5" strokeWidth={2.1} />
    </button>
  );
}

export function Link({ to, className = '', children, ...rest }: { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <a href={`#${to}`} onClick={noteLinkNavigation} className={className} {...rest}>
      {children}
    </a>
  );
}
