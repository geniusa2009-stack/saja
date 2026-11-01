import type { LocationId } from '@/domain/types';
import { LOCATIONS } from '@/content/world';
import { MISSIONS } from '@/content/missions';
import { locationState, missionsUntilUnlock } from '@/domain/world';
import { Sheet } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { useJourney } from '@/app/hooks';
import './worldmap.css';

/** A schematic map of the whole world: a road through places, lit up to where you've learned. */
export function WorldMapDiagram({ current, onSelect }: { current: LocationId | null; onSelect?: (id: LocationId) => void }) {
  const { t, l, isRTL } = useI18n();
  const journey = useJourney();
  // Two-row serpentine layout keeps it readable on phones.
  const pos = (i: number) => {
    const row = i < 5 ? 0 : 1;
    const col = row === 0 ? i : 8 - i;
    const x = 10 + col * 20;
    return { x: isRTL ? 100 - x : x, y: row === 0 ? 30 : 74 };
  };
  const pts = LOCATIONS.map((_, i) => pos(i));
  const bend = isRTL ? -14 : 14;
  const toD = (n: number) =>
    pts
      .slice(0, n)
      .map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : i === 5 ? `C${pts[4].x + bend} ${pts[4].y} ${p.x + bend} ${p.y} ${p.x} ${p.y}` : `L${p.x} ${p.y}`))
      .join(' ');
  const d = toD(pts.length);
  // The lit road is drawn as its own path (no dash tricks) so strokes stay crisp at any aspect ratio.
  const openCount = LOCATIONS.filter((x) => journey.unlocked.has(x.id)).length;
  const litD = openCount > 1 ? toD(openCount) : '';

  return (
    <div className="wmap">
      <svg viewBox="0 0 100 100" className="wmap__svg" preserveAspectRatio="none" aria-hidden>
        <path d={d} className="wmap__road" vectorEffect="non-scaling-stroke" />
        {litD && <path d={litD} className="wmap__lit" vectorEffect="non-scaling-stroke" />}
      </svg>
      {LOCATIONS.map((loc, i) => {
        const state = locationState(loc, { completed: journey.completed }, MISSIONS, current);
        const p = pos(i);
        const left = missionsUntilUnlock(loc, { completed: journey.completed });
        return (
          <button
            key={loc.id}
            type="button"
            className="wmap__node"
            data-state={state}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onClick={() => onSelect?.(loc.id)}
            disabled={!onSelect}
            aria-label={`${l(loc.name)} — ${state === 'asleep' ? (left === 1 ? t('world.asleepOne') : t('world.asleepMany', { n: left })) : l(loc.purpose)}`}
          >
            <span className="wmap__arch">
              <Icon name={state === 'done' ? 'check' : state === 'asleep' ? 'moon' : state === 'current' ? 'star' : 'lantern'} size={16} />
            </span>
            <span className="wmap__name">{l(loc.name)}</span>
            {state === 'current' && <span className="wmap__here">{t('world.youAreHere')}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function WorldMapSheet({ open, onClose, current, onTravel }: { open: boolean; onClose: () => void; current: LocationId; onTravel: (id: LocationId) => void }) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={t('world.map')} placement="auto">
      <p className="t-serif-italic gold" style={{ fontSize: '1.15rem', marginBottom: 8 }}>
        {t('app.campaign')}
      </p>
      <WorldMapDiagram current={current} onSelect={onTravel} />
    </Sheet>
  );
}
