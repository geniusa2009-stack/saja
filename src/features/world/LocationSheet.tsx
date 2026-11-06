import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { webglAvailable } from './game/webgl';
import type { LocationId } from '@/domain/types';
import { LOCATION_BY_ID } from '@/content/world';
import { missionsAt } from '@/content/missions';
import { NPCS } from '@/content/npcs';
import { missionsUntilUnlock } from '@/domain/world';
import { Button, Chip, Sheet } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { useTutor } from '@/store/tutor';
import { Avatar } from '@/features/character/Character';

export function LocationSheet({ id, onClose, completed, unlocked, onExplore }: { id: LocationId | null; onClose: () => void; completed: Set<string>; unlocked: Set<LocationId>; onExplore?: (id: 'village' | 'mosque') => void }) {
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const openTutor = useTutor((s) => s.openTutor);
  const loc = id ? LOCATION_BY_ID[id] : null;
  const asleep = loc ? !unlocked.has(loc.id) : false;
  const missions = loc ? missionsAt(loc.id) : [];
  const npc = loc ? NPCS.find((n) => n.at === loc.id) : undefined;
  const remaining = loc ? missionsUntilUnlock(loc, { completed: [...completed] }) : 0;
  const allDone = missions.length > 0 && missions.every((m) => completed.has(m.id));
  const explorationId = loc?.id === 'village' || loc?.id === 'mosque' ? loc.id : null;
  // While the learner reads about the village, fetch its 3D code and model (≈1.8 MB) so
  // "Explore" opens faster. Only where 3D will actually be used, and only when unlocked.
  const prefetch3D = explorationId === 'village' && !asleep && !!onExplore;
  useEffect(() => {
    if (!prefetch3D || !webglAvailable()) return;
    // The 3D component's code, then the model.
    void import('./Village3D').then(() => import('./villageAssets')).then((m) => m.preloadVillageAssets()).catch(() => undefined);
  }, [prefetch3D]);

  return (
    <Sheet open={!!loc} onClose={onClose} title={loc ? l(loc.name) : ''} icon={<span className="tile__icon"><Icon name={asleep ? 'moon' : 'lantern'} size={20} /></span>}>
      {loc && (
        <div className="stack" style={{ '--stack-gap': '18px' } as React.CSSProperties}>
          <div className="loc-head">
            <span className="t-caption gold">{t('world.chapter', { n: loc.chapter })}</span>
            <p className="t-small muted">{l(loc.purpose)}</p>
            <p className="t-serif-italic" style={{ fontSize: '1.2rem', color: 'var(--gold-100)' }}>
              {asleep ? (remaining === 1 ? t('world.asleepOne') : t('world.asleepMany', { n: remaining })) : l(loc.arrival)}
            </p>
          </div>

          {!asleep && explorationId && onExplore && (
            <Button icon="forward" onClick={() => onExplore(explorationId)}>
              {explorationId === 'village' ? l({ en: 'Explore the village', ar: 'استكشف القرية' }) : l({ en: 'Explore the courtyard', ar: 'استكشف الساحة' })}
            </Button>
          )}

          {!asleep && npc && (
            <div className="card card--flat row" style={{ alignItems: 'flex-start' }}>
              <Avatar look={npc.look} size={44} />
              <p className="t-small">
                <strong style={{ display: 'block' }}>{l(npc.name)}</strong>
                {l(npc.lines[npc.lines.length - 1])}
              </p>
            </div>
          )}

          <div className="stack" style={{ '--stack-gap': '10px' } as React.CSSProperties}>
            <h3 className="t-caption muted">{t('world.missionsHere')}</h3>
            {allDone && <p className="t-small muted">{t('world.allDone')}</p>}
            {missions.map((m) => {
              const done = completed.has(m.id);
              return (
                <div key={m.id} className="card loc-mission" data-done={done || undefined}>
                  <span className="loc-mission__num">{done ? <Icon name="check" size={18} /> : m.number}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700 }}>{l(m.title)}</p>
                    <p className="t-small muted">{l(m.summary)}</p>
                    <div className="row wrap" style={{ marginTop: 8, '--row-gap': '6px' } as React.CSSProperties}>
                      <Chip icon="clock" tone="quiet">{t('m.minutes', { n: m.minutes })}</Chip>
                      <Chip tone="quiet">{t(`m.modeName.${m.modality}`)}</Chip>
                    </div>
                  </div>
                  {!asleep && (
                    <Button size="sm" variant={done ? 'secondary' : 'primary'} onClick={() => navigate(`/mission/${m.id}`)}>
                      {done ? t('m.resume') : t('a.begin')}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {asleep ? (
            <Button variant="secondary" icon="map" onClick={onClose}>
              {t('a.continueJourney')}
            </Button>
          ) : (
            <Button
              variant="ghost"
              icon="star"
              onClick={() => {
                onClose();
                openTutor(missions[0]?.knowledge[0]);
              }}
            >
              {t('world.askSiraj')}
            </Button>
          )}
        </div>
      )}
    </Sheet>
  );
}
