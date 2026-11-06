import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Icon, type IconName } from '@/brand/Icon';
import { SajaMark } from '@/brand/SajaMark';
import { Sheet, useIsDesktop } from '@/design-system';
import { useI18n, type TKey } from '@/i18n';
import { useProfile } from '@/store/profile';
import { useSettings } from '@/store/settings';
import { Avatar } from '@/features/character/Character';
import { ModeBadge } from '@/features/account/ConnectionStatus';
import { useConnection } from '@/store/connection';
import './nav.css';

interface Item {
  to: string;
  icon: IconName;
  label: TKey;
  desc?: TKey;
  /** Private messages exist only for adults with accounts (the server enforces it; this just hides the door). */
  adultsOnly?: boolean;
}

const PRIMARY: Item[] = [
  { to: '/', icon: 'home', label: 'nav.home' },
  { to: '/journey', icon: 'journey', label: 'nav.journey' },
  { to: '/quran', icon: 'quran', label: 'nav.quran' },
  { to: '/learn', icon: 'learn', label: 'nav.learn' },
  { to: '/hadith', icon: 'quote', label: 'nav.hadith' },
  { to: '/day', icon: 'day', label: 'nav.day' },
  { to: '/circles', icon: 'community', label: 'nav.community' },
  { to: '/scholar', icon: 'scholar', label: 'nav.scholar' },
  { to: '/explore', icon: 'explore', label: 'nav.explore' },
];
const TOOLS: Item[] = [
  { to: '/amanah', icon: 'seal', label: 'nav.amanah', desc: 'am.sub' },
  { to: '/nour', icon: 'eye', label: 'nav.nour', desc: 'nour.sub' },
];
const MOBILE: Item[] = [PRIMARY[0], PRIMARY[1], PRIMARY[4], PRIMARY[5]];
const MORE: Item[] = [
  { to: '/quran', icon: 'quran', label: 'nav.quran', desc: 'quran.sub' },
  { to: '/learn', icon: 'learn', label: 'nav.learn', desc: 'learn.sub' },
  { to: '/hadith', icon: 'quote', label: 'nav.hadith', desc: 'hadith.sub' },
  { to: '/scholar', icon: 'scholar', label: 'nav.scholar', desc: 'sch.sub' },
  { to: '/explore', icon: 'explore', label: 'nav.explore', desc: 'ex.sub' },
  { to: '/inbox', icon: 'bell', label: 'nav.inbox', desc: 'inbox.sub' },
  { to: '/messages', icon: 'send', label: 'nav.messages', desc: 'dm.sub', adultsOnly: true },
  { to: '/profile', icon: 'profile', label: 'nav.profile', desc: 'prof.title' },
  ...TOOLS,
];

function UnreadDot() {
  const n = useConnection((s) => s.unread);
  const { t, num } = useI18n();
  if (!n) return null;
  return (
    <span className="nav-unread" aria-label={t('nav.unread', { n })}>
      {n > 9 ? '9+' : num(n)}
    </span>
  );
}

const isActive = (path: string, to: string) => (to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`));

export function Nav() {
  const desktop = useIsDesktop();
  return desktop ? <Rail /> : <BottomBar />;
}

function Rail() {
  const { t } = useI18n();
  const profile = useProfile((s) => s.profile);
  const focus = useSettings((s) => s.focusMode);
  const { pathname } = useLocation();
  const adultAccount = useConnection((s) => s.status === 'online' && !!s.me && !s.me.user.isGuest && s.me.user.ageBand === 'adult');
  return (
    <nav className="rail" aria-label={t('nav.primary')}>
      <NavLink to="/" className="rail__brand" aria-label="SAJA">
        <SajaMark size={40} variant="color" />
      </NavLink>
      <ul className="rail__list">
        {PRIMARY.map((it) => (
          <li key={it.to}>
            <NavLink to={it.to} end={it.to === '/'} className="rail__item" data-dim={focus && it.to === '/circles' ? '' : undefined}>
              {isActive(pathname, it.to) && <motion.span layoutId="rail-active" className="rail__active" transition={{ type: 'spring', stiffness: 400, damping: 36 }} />}
              <Icon name={it.icon} size={22} />
              <span className="rail__label">{t(it.label)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="rail__sep" role="separator" />
      <ul className="rail__list" aria-label={t('nav.tools')}>
        {TOOLS.map((it) => (
          <li key={it.to}>
            <NavLink to={it.to} className="rail__item rail__item--tool">
              {isActive(pathname, it.to) && <motion.span layoutId="rail-active" className="rail__active" />}
              <Icon name={it.icon} size={20} />
              <span className="rail__label">{t(it.label)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="spacer" />
      <NavLink to="/inbox" className="rail__item rail__item--tool" aria-label={t('nav.inbox')}>
        {isActive(pathname, '/inbox') && <motion.span layoutId="rail-active" className="rail__active" />}
        <Icon name="bell" size={20} />
        <UnreadDot />
        <span className="rail__label">{t('nav.inbox')}</span>
      </NavLink>
      {adultAccount && (
        <NavLink to="/messages" className="rail__item rail__item--tool" aria-label={t('nav.messages')}>
          {isActive(pathname, '/messages') && <motion.span layoutId="rail-active" className="rail__active" />}
          <Icon name="send" size={20} />
          <span className="rail__label">{t('nav.messages')}</span>
        </NavLink>
      )}
      <div className="rail__mode">
        <ModeBadge compact />
      </div>
      <NavLink to="/profile" className="rail__me" aria-label={t('nav.profile')}>
        {profile && <Avatar look={profile.look} size={40} gold={isActive(pathname, '/profile')} />}
      </NavLink>
    </nav>
  );
}

function BottomBar() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [more, setMore] = useState(false);
  const adultAccount = useConnection((s) => s.status === 'online' && !!s.me && !s.me.user.isGuest && s.me.user.ageBand === 'adult');
  const moreActive = MORE.some((m) => isActive(pathname, m.to));
  return (
    <>
      <nav className="bottombar" aria-label={t('nav.primary')}>
        {MOBILE.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.to === '/'} className="bottombar__item">
            {isActive(pathname, it.to) && <motion.span layoutId="bb-active" className="bottombar__active" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <Icon name={it.icon} size={22} />
            <span>{t(it.label)}</span>
          </NavLink>
        ))}
        <button type="button" className="bottombar__item" aria-expanded={more} aria-haspopup="dialog" onClick={() => setMore(true)} aria-current={moreActive ? 'page' : undefined}>
          {moreActive && <motion.span layoutId="bb-active" className="bottombar__active" />}
          <Icon name="more" size={22} />
          <UnreadDot />
          <span>{t('nav.more')}</span>
        </button>
      </nav>
      <Sheet open={more} onClose={() => setMore(false)} title={t('nav.more')} placement="bottom">
        <div style={{ marginBottom: 8 }}>
          <ModeBadge />
        </div>
        <ul className="list">
          {MORE.filter((it) => !it.adultsOnly || adultAccount).map((it) => (
            <li key={it.to}>
              <button
                type="button"
                className="more-row"
                onClick={() => {
                  setMore(false);
                  navigate(it.to);
                }}
              >
                <span className="tile__icon">
                  <Icon name={it.icon} size={20} />
                </span>
                <span style={{ display: 'grid', gap: 2, textAlign: 'start' }}>
                  <strong>{t(it.label)}</strong>
                  {it.desc && <span className="muted t-small">{t(it.desc)}</span>}
                </span>
                <Icon name="forward" size={18} className="flip-rtl muted" />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
