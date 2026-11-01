import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useConnection } from '@/store/connection';
import { useSettings } from '@/store/settings';
import { fakeServer, offlineFetch } from '@/test/server';
import type { Me } from '@/api/types';
import Messages from './Messages';

const me = (ageBand: 'child' | 'teen' | 'adult', isGuest = false): Me => ({
  user: {
    id: 'u1',
    email: isGuest ? null : 'a@example.com',
    isGuest,
    roles: ['learner'],
    ageBand,
    age: { declared: ageBand, approved: null, consent: 'not_required' },
    communityAllowed: true,
    parental: { approveCircles: true, quickRepliesOnly: false, dailyMinutes: 45, approvedCircles: [] },
    memory: { style: true, topics: true, schedule: false, conversations: false },
  },
  profile: null,
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Messages />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => useSettings.setState({ locale: 'en' }));
afterEach(() => {
  cleanup();
  offlineFetch();
  useConnection.setState({ status: 'offline', me: null });
});

describe('private messages UI', () => {
  it('children, teens and guests see that private messages are not for them', () => {
    for (const m of [me('child'), me('teen'), me('adult', true)]) {
      useConnection.setState({ status: 'online', me: m });
      renderAt('/messages');
      expect(screen.getByText(m.user.isGuest ? 'Private messages need an account' : 'Private messages are for adults only')).toBeInTheDocument();
      cleanup();
    }
  });

  it('an adult sees a request and can accept it', async () => {
    const user = userEvent.setup();
    useConnection.setState({ status: 'online', me: me('adult') });
    const calls = fakeServer({
      '/dm': () => [200, { threads: [{ id: 't1', status: 'requested', requested_by_me: false, other_id: 'u2', other_name: 'Aisha', other_look: null, last: null }] }],
      'POST /dm/t1/respond': () => [200, { status: 'active' }],
      '/dm/t1/messages': () => [200, { messages: [], status: 'active', requestedByMe: false }],
    });
    renderAt('/messages');
    expect(await screen.findByText('Aisha would like to talk')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Accept' }));
    expect(calls.some((c) => c.url === '/api/dm/t1/respond' && (c.body as { accept: boolean }).accept === true)).toBe(true);
  });

  it('a message the server blocks is explained, not shown as sent', async () => {
    const user = userEvent.setup();
    useConnection.setState({ status: 'online', me: me('adult') });
    fakeServer({
      '/dm': () => [200, { threads: [{ id: 't1', status: 'active', requested_by_me: true, other_id: 'u2', other_name: 'Aisha', other_look: null, last: null }] }],
      '/dm/t1/messages': () => [200, { messages: [], status: 'active', requestedByMe: true }],
      'POST /dm/t1/messages': () => [422, { error: { code: 'policy_blocked', message: 'no', details: { flags: ['phone'] } } }],
    });
    renderAt('/messages/t1');
    await user.type(await screen.findByPlaceholderText('Write a message…'), 'call me 0551234567');
    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/safety rules/);
  });
});
