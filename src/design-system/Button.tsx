import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from '@/brand/Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'emerald' | 'celebrate' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  icon?: IconName;
  iconEnd?: IconName;
  loading?: boolean;
  children?: ReactNode;
}

const DIRECTIONAL: IconName[] = ['back', 'forward', 'send', 'reply'];

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, icon, iconEnd, loading, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  const cls = ['btn', variant !== 'primary' && `btn--${variant}`, size !== 'md' && `btn--${size}`, block && 'btn--block', className].filter(Boolean).join(' ');
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="btn__spinner" aria-hidden /> : icon && <Icon name={icon} size={size === 'sm' ? 16 : 19} className={DIRECTIONAL.includes(icon) ? 'flip-rtl' : undefined} />}
      {children}
      {iconEnd && !loading && <Icon name={iconEnd} size={size === 'sm' ? 16 : 19} className={DIRECTIONAL.includes(iconEnd) ? 'flip-rtl' : undefined} />}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  size?: 'sm' | 'md';
  tone?: 'default' | 'plain' | 'glass';
  iconSize?: number;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, size = 'md', tone = 'default', iconSize, className = '', type = 'button', ...rest },
  ref,
) {
  const cls = ['icon-btn', size === 'sm' && 'icon-btn--sm', tone !== 'default' && `icon-btn--${tone}`, className].filter(Boolean).join(' ');
  return (
    <button ref={ref} type={type} className={cls} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={iconSize ?? (size === 'sm' ? 18 : 20)} className={DIRECTIONAL.includes(icon) ? 'flip-rtl' : undefined} />
    </button>
  );
});
