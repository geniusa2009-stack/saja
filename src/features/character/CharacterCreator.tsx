import type { CharacterLook } from '@/domain/types';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { Character } from './Character';
import { ACCESSORIES, HAIRS, HAIR_COLORS, HIJAB_COLORS, OUTFITS, OUTFIT_COLORS, SKIN_TONES, randomLook } from './palette';
import './creator.css';



function Swatches({ label, colors, value, onChange }: { label: string; colors: string[]; value: number; onChange: (i: number) => void }) {
  return (
    <fieldset className="cc-group">
      <legend className="cc-legend">{label}</legend>
      <div className="cc-swatches" role="radiogroup" aria-label={label}>
        {colors.map((c, i) => (
          <button key={c} type="button" role="radio" aria-checked={value === i} aria-label={`${label} ${i + 1}`} className="cc-swatch" style={{ background: c }} onClick={() => onChange(i)} />
        ))}
      </div>
    </fieldset>
  );
}

function Options<T extends string>({ label, values, value, onChange, labelFor }: { label: string; values: T[]; value: T; onChange: (v: T) => void; labelFor: (v: T) => string }) {
  return (
    <fieldset className="cc-group">
      <legend className="cc-legend">{label}</legend>
      <div className="cc-options" role="radiogroup" aria-label={label}>
        {values.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} className="chip" aria-pressed={value === v} onClick={() => onChange(v)}>
            {labelFor(v)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function CharacterPreview({ look, name }: { look: CharacterLook; name?: string }) {
  return (
    <div className="cc-preview" aria-live="polite">
      <div className="cc-stage">
        <svg className="cc-arch" viewBox="0 0 120 140" aria-hidden>
          <path d="M60 4 C63 17 72 24 84 31 C97 39 104 51 104 68 V136 H16 V68 C16 51 23 39 36 31 C48 24 57 17 60 4 Z" fill="none" stroke="rgb(221 190 127 / .35)" strokeWidth="0.8" />
        </svg>
        <div className="cc-hill" aria-hidden />
        <div className="cc-char">
          <Character look={look} size={150} pose="idle" title={name} />
        </div>
      </div>
      {name && <p className="cc-name">{name}</p>}
    </div>
  );
}

export function CharacterCreator({ look, onChange }: { look: CharacterLook; onChange: (l: CharacterLook) => void }) {
  const { t } = useI18n();
  const set = (p: Partial<CharacterLook>) => onChange({ ...look, ...p });
  const headCovered = look.hair === 'hijab' || look.hair === 'wrap';
  return (
    <div className="cc-controls">
      <Swatches label={t('char.skin')} colors={SKIN_TONES} value={look.skin} onChange={(skin) => set({ skin })} />
      <Options label={t('char.hair')} values={HAIRS} value={look.hair} onChange={(hair) => set({ hair })} labelFor={(v) => t(`char.hair.${v}`)} />
      <Swatches label={headCovered ? t('char.headColor') : t('char.hairColor')} colors={headCovered ? HIJAB_COLORS : HAIR_COLORS} value={look.hairColor} onChange={(hairColor) => set({ hairColor })} />
      <Options label={t('char.outfit')} values={OUTFITS} value={look.outfit} onChange={(outfit) => set({ outfit })} labelFor={(v) => t(`char.outfit.${v}`)} />
      <Swatches label={t('char.outfitColor')} colors={OUTFIT_COLORS} value={look.outfitColor} onChange={(outfitColor) => set({ outfitColor })} />
      <Options label={t('char.accessory')} values={ACCESSORIES} value={look.accessory} onChange={(accessory) => set({ accessory })} labelFor={(v) => t(`char.acc.${v}`)} />
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange(randomLook())} style={{ justifySelf: 'start' }}>
        <Icon name="sparkle" size={16} /> {t('char.random')}
      </button>
    </div>
  );
}
