import { useId, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import { Icon, type IconName } from '@/brand/Icon';

export function Switch({ checked, onChange, label, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; id?: string }) {
  return <button id={id} type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" disabled={disabled} onClick={() => onChange(!checked)} />;
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  const id = useId();
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="segmented__btn"
          aria-pressed={o.value === value}
          onClick={(e) => {
            // In a row that scrolls sideways on phones, keep the chosen option in view.
            e.currentTarget.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            onChange(o.value);
          }}
        >
          {o.value === value && <motion.span layoutId={`seg-${id}`} className="segmented__pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Tile({ selected, onClick, icon, title, sub, role = 'button', trailing }: { selected?: boolean; onClick: () => void; icon?: IconName | ReactNode; title: ReactNode; sub?: ReactNode; role?: 'button' | 'radio' | 'checkbox'; trailing?: ReactNode }) {
  const aria = role === 'button' ? { 'aria-pressed': selected } : { role, 'aria-checked': selected };
  return (
    <button type="button" className="tile" onClick={onClick} {...aria}>
      {icon && <span className="tile__icon">{typeof icon === 'string' ? <Icon name={icon as IconName} size={20} /> : icon}</span>}
      <span style={{ display: 'grid', gap: 2 }}>
        <span className="tile__title">{title}</span>
        {sub && <span className="tile__sub">{sub}</span>}
      </span>
      {trailing ?? (selected && <Icon name="check" size={20} className="tile__check" />)}
    </button>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}
export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />;
}

export function Chip({ children, tone, icon, onClick, pressed, className = '' }: { children: ReactNode; tone?: 'gold' | 'emerald' | 'turquoise' | 'quiet' | 'demo'; icon?: IconName; onClick?: () => void; pressed?: boolean; className?: string }) {
  const cls = `chip ${tone ? `chip--${tone}` : ''} ${className}`;
  const inner = (
    <>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </>
  );
  return onClick ? (
    <button type="button" className={cls} onClick={onClick} aria-pressed={pressed}>
      {inner}
    </button>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

export function Bar({ value, gold, label }: { value: number; gold?: boolean; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={`bar ${gold ? 'bar--gold' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <div className="bar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Section({ title, action, children, id }: { title: ReactNode; action?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="section" aria-labelledby={id}>
      <div className="section__head">
        <h2 id={id} className="section__title">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
