/**
 * Child-safety regression tests for the LIVE (server) community UI: the page must
 * follow the server's decisions, and a server refusal must never look like success.
 */
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Circles from './Circles';
import CircleRoom from './CircleRoom';
import { useConnection } from '@/store/connection';
import { useProfile } from '@/store/profile';
import { useSettings } from '@/store/settings';
import { DEFAULT_LOOK } from '@/features/character/palette';
import type { Me } from '@/api/types';

const child: Me = {
  user: {
    id: 'kid',
    email: null,
    isGuest: true,
    roles: ['learner'],
    ageBand: 'child',
    age: { declared: 'child', approved: null, consent: 'pending' },
    communityAllowed: false,
    parental: { approveCircles: true, quickRepliesOnly: false, dailyMinutes: 45, approvedCircles: [] },
    memory: { style: true, topics: true, schedule: false, conversations: false },
  },
  profile: null,
};

function server(handler: (path: string, init?: RequestInit) => [number, unknown]) {
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const [status, body] = handler(url.replace(/^\/api/, ''), init);
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
}

beforeEach(() => {
  useSettings.setState({ locale: 'en' });
  useProfile.setState({ profile: { name: 'Sara', look: DEFAULT_LOOK, purpose: 'child', ageBand: 'child', level: 'beginner', goals: ['prayer'], interests: ['prayer'], modality: 'hands-on', createdAt: Date.now() } });
  useConnection.setState({ status: 'online', me: child, system: null, unread: 0 });
});
afterEach(() => {
  cleanup();
  useConnection.setState({ status: 'offline', me: null });
});

describe('live circles follow the server’s child-safety decisions', () => {
  it('a child without guardian consent sees why — and no Join button', async () => {
    server((p) => (p === '/circles' ? [200, { circles: [{ id: 'garden', name: { en: 'Garden Circle', ar: '' }, joined: false, members: 5, join: { ok: false, reason: 'needs-consent' } }], communityAllowed: false }] : [404, {}]));
    render(
      <MemoryRouter>
        <Circles />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/needs to link your account and give consent/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /join/i })).toBeNull();
  });

  it('a message the server blocks is not shown as sent, and the reason is explained', async () => {
    const user = userEvent.setup();
    server((p, init) => {
      if (p === '/circles/garden') return [200, { id: 'garden', members: [], membership: 'member', policy: { freeText: true } }];
      if (p === '/circles/garden/messages' && init?.method === 'POST') return [422, { error: { code: 'policy_blocked', message: 'This message wasn’t sent.', details: { flags: ['phone'] } } }];
      if (p === '/circles/garden/messages') return [200, { messages: [], lastReadAt: null }];
      if (p === '/blocks') return [200, { blocked: [] }];
      return [200, { ok: true }];
    });
    render(
      <MemoryRouter initialEntries={['/circles/garden']}>
        <Routes>
          <Route path="/circles/:id" element={<CircleRoom />} />
        </Routes>
      </MemoryRouter>,
    );
    const input = await screen.findByPlaceholderText(/write something encouraging/i, {}, { timeout: 4000 });
    await user.type(input, 'call me on 0551234567');
    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/phone/i);
    expect(screen.queryByText('call me on 0551234567', { selector: '.msg__text' })).toBeNull();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });
});
