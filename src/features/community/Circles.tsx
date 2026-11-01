/**
 * Learning Circles — small, moderated groups on the same path.
 * Which circles you see and can join is decided by the safety policy
 * (age band, moderation, guardian approval), enforced in the community service.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CIRCLES, MEMBERS, type Circle } from '@/content/community';
import { Bar, Button, Chip, DemoNote, EmptyState, Section } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { Page } from '@/app/Page';
import { useCommunity } from '@/store/community';
import { usePolicy, useProfile } from '@/store/profile';
import { useSettings } from '@/store/settings';
import { joinDecision } from '@/services/community';
import { Avatar } from '@/features/character/Character';
import { GuardianGate } from './GuardianGate';
import { useConnection } from '@/store/connection';
import { ApiError } from '@/api/client';
import { useLiveCircles, type LiveCircle } from './live';
import { Link } from 'react-router-dom';
import { toast } from '@/design-system';
import './community.css';

export default function Circles() {
  const { t } = useI18n();
  const policy = usePolicy();
  const joined = useCommunity((s) => s.joined);
  const focus = useSettings((s) => s.focusMode);
  const setFocus = useSettings((s) => s.setFocusMode);
  const online = useConnection((s) => s.status === 'online' && !!s.me);
  const live = useLiveCircles(online);
  // Age-appropriate spaces only: children/teens never even see other bands' circles.
  // Live, the server decides which circles exist for this person.
  const visible = online ? CIRCLES.filter((c) => live.circles?.some((x) => x.id === c.id)) : CIRCLES.filter((c) => !policy.ageMatchedCirclesOnly || c.ageBand === policy.ageBand);
  const joinedIds = online ? (live.circles ?? []).filter((c) => c.joined).map((c) => c.id) : joined;
  const mine = visible.filter((c) => joinedIds.includes(c.id));
  const others = visible.filter((c) => !joinedIds.includes(c.id));
  const liveFor = (id: string) => live.circles?.find((x) => x.id === id);

  return (
    <Page eyebrow={t('nav.community')} title={t('com.title')} sub={t('com.sub')}>
      <div className="stack" style={{ '--stack-gap': '28px' } as React.CSSProperties}>
        {focus && (
          <div className="card card--flat row wrap focus-banner">
            <Icon name="focus" size={20} />
            <span style={{ flex: 1 }}>{t('day.focusOn')}</span>
            <Button size="sm" variant="ghost" onClick={() => setFocus(false)}>
              {t('a.change')}
            </Button>
          </div>
        )}
        {(policy.ageBand === 'child' || policy.ageBand === 'teen') && (
          <p className="safety-note">
            <Icon name="shield" size={16} /> {policy.ageBand === 'child' ? t('com.noDMs') : t('com.noDMsTeen')} · {t('com.moderated')}
          </p>
        )}

        <Section title={t('com.yours')} id="mine">
          {mine.length === 0 ? (
            <div className="card card--flat">
              <EmptyState icon="community" title={t('com.noneYet')} body={t('com.noneYetBody')} />
            </div>
          ) : (
            <div className="circle-grid">
              {mine.map((c) => (
                <CircleCard key={c.id} circle={c} joined live={liveFor(c.id)} />
              ))}
            </div>
          )}
        </Section>

        {others.length > 0 && (
          <Section title={t('com.suggested')} id="others">
            <div className="circle-grid">
              {others.map((c) => (
                <CircleCard key={c.id} circle={c} live={liveFor(c.id)} onJoined={live.reload} />
              ))}
            </div>
          </Section>
        )}
        <DemoNote>{online ? t('com.liveNote') : t('com.sampleNote')}</DemoNote>
      </div>
    </Page>
  );
}

export function CircleCard({ circle, joined, live, onJoined }: { circle: Circle; joined?: boolean; live?: LiveCircle; onJoined?: () => void }) {
  const online = useConnection((s) => s.status === 'online' && !!s.me);
  if (online) return <LiveCircleCard circle={circle} joined={joined} live={live} onJoined={onJoined} />;
  return <DemoCircleCard circle={circle} joined={joined} />;
}

/** Live: the server's join decision (age band, guardian consent, circle approval, account) is shown as-is. */
function LiveCircleCard({ circle, joined, live, onJoined }: { circle: Circle; joined?: boolean; live?: LiveCircle; onJoined?: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const own = useLiveCircles(!live);
  const info = live ?? own.circles?.find((x) => x.id === circle.id);
  const [busy, setBusy] = useState(false);
  const d = info?.join;
  const foot = joined || info?.joined ? null : !d ? null : d.ok ? (
    <Button
      block
      icon="plus"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await own.join(circle.id);
          onJoined?.();
          navigate(`/circles/${circle.id}`);
        } catch (e) {
          toast(e instanceof ApiError ? e.message : t('err.internal'));
        } finally {
          setBusy(false);
        }
      }}
    >
      {t('com.join')}
    </Button>
  ) : d.reason === 'needs-consent' ? (
    <p className="t-small muted">
      <Icon name="shield" size={14} /> {t('com.needsConsent')} <Link to="/profile#guardian">{t('guard.getCode')}</Link>
    </p>
  ) : d.reason === 'needs-guardian' ? (
    <p className="t-small muted">
      <Icon name="clock" size={14} /> {t('com.needsGuardianApproval')}
    </p>
  ) : d.reason === 'needs-account' ? (
    <p className="t-small muted">
      <Icon name="key" size={14} /> {t('com.needsAccount')} <Link to="/account">{t('acc.signup')}</Link>
    </p>
  ) : (
    <p className="t-small muted">{t('com.ageMismatch')}</p>
  );
  return <CircleCardView circle={circle} foot={foot} memberCount={info?.members} />;
}

function DemoCircleCard({ circle, joined }: { circle: Circle; joined?: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const policy = usePolicy();
  const parental = useProfile((s) => s.parental);
  const setParental = useProfile((s) => s.setParental);
  const pending = useCommunity((s) => s.pending.includes(circle.id));
  const join = useCommunity((s) => s.join);
  const requestJoin = useCommunity((s) => s.requestJoin);
  const [gate, setGate] = useState(false);
  const decision = joinDecision(policy, circle, parental);

  const onJoin = () => {
    if (decision.ok) {
      if (join(circle.id)) navigate(`/circles/${circle.id}`);
    } else if (decision.reason === 'needs-guardian') requestJoin(circle.id);
  };

  return (
    <CircleCardView
      circle={circle}
      foot={
        !joined && (
        <>
          {decision.ok ? (
            <Button block onClick={onJoin} icon="plus">
              {t('com.join')}
            </Button>
          ) : decision.reason === 'needs-guardian' ? (
            pending ? (
              <div className="row wrap" style={{ justifyContent: 'space-between' }}>
                <span className="t-small muted">
                  <Icon name="clock" size={14} /> {t('com.pendingApproval')}
                </span>
                <Button size="sm" variant="secondary" icon="shield" onClick={() => setGate(true)}>
                  {t('com.approveNow')}
                </Button>
              </div>
            ) : (
              <Button block variant="secondary" icon="shield" onClick={onJoin}>
                {t('com.requestApproval')}
              </Button>
            )
          ) : (
            <p className="t-small muted">{t('com.ageMismatch')}</p>
          )}
        </>
        )
      }
    >
      <GuardianGate
        open={gate}
        onClose={() => setGate(false)}
        onPass={() => {
          setGate(false);
          setParental({ approvedCircles: [...new Set([...parental.approvedCircles, circle.id])] });
          if (join(circle.id)) navigate(`/circles/${circle.id}`);
        }}
      />
    </CircleCardView>
  );
}

function CircleCardView({ circle, foot, memberCount, children }: { circle: Circle; foot?: React.ReactNode; memberCount?: number; children?: React.ReactNode }) {
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const mentor = MEMBERS[circle.mentorId];
  const members = circle.memberIds.map((id) => MEMBERS[id]).filter(Boolean);
  return (
    <article className="card circle-card">
      <button type="button" className="circle-card__main" onClick={() => navigate(`/circles/${circle.id}`)}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className="t-h3">{l(circle.name)}</h3>
            <p className="t-small muted">{l(circle.tagline)}</p>
          </div>
          <Icon name="forward" size={18} className="flip-rtl muted" />
        </div>
        <div className="row wrap" style={{ '--row-gap': '6px' } as React.CSSProperties}>
          <Chip tone="quiet">{l(circle.ageLabel)}</Chip>
          <Chip tone="quiet">{circle.languages.map((x) => (x === 'ar' ? 'العربية' : 'English')).join(' · ')}</Chip>
          {circle.moderated && (
            <Chip tone="emerald" icon="shield">
              {t('com.moderated')}
            </Chip>
          )}
          {circle.ageBand === 'child' && (
            <Chip tone="gold" icon="check">
              {t('com.parentApproved')}
            </Chip>
          )}
        </div>
        <div className="row">
          <Avatar look={mentor.look} size={36} gold />
          <span className="t-small">
            {mentor.name} · <span className="muted">{t('com.mentor')}</span>
          </span>
          <span className="spacer" />
          <span className="avatar-stack" aria-label={t('com.members', { n: memberCount ?? members.length })}>
            {members.slice(1, 5).map((m) => (
              <Avatar key={m.id} look={m.look} size={26} />
            ))}
          </span>
        </div>
        <div className="stack" style={{ '--stack-gap': '6px' } as React.CSSProperties}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="t-small muted">{l(circle.weeklyGoal.label)}</span>
            <span className="t-small gold">
              {circle.weeklyGoal.current}/{circle.weeklyGoal.target}
            </span>
          </div>
          <Bar value={circle.weeklyGoal.current / circle.weeklyGoal.target} label={l(circle.weeklyGoal.label)} gold />
        </div>
      </button>
      {foot && <div className="circle-card__foot">{foot}</div>}
      {children}
    </article>
  );
}
