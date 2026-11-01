import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useConnection } from '@/store/connection';
import { useProfile } from '@/store/profile';
import { useSettings } from '@/store/settings';
import { DEFAULT_LOOK } from '@/features/character/palette';
import { fakeServer, offlineFetch } from '@/test/server';
import MissionRunner from '@/features/missions/MissionRunner';
import { RestScreen, UsageLine } from './RestScreen';

const limited = { enforced: true, limitMinutes: 30, extraMinutes: 0, usedSeconds: 1900, remainingSeconds: 0, limited: true, date: '2026-09-29' };

beforeEach(() => {
  useSettings.setState({ locale: 'en' });
  useProfile.setState({ profile: { name: 'Sara', look: DEFAULT_LOOK, purpose: 'child', ageBand: 'child', level: 'beginner', goals: ['prayer'], interests: ['prayer'], modality: 'hands-on', createdAt: Date.now() } });
});
afterEach(() => {
  cleanup();
  useConnection.setState({ status: 'offline', me: null, usage: null });
  offlineFetch();
});

describe('guardian time limit (UI follows the server)', () => {
  it('shows nothing unless the server says the limit is reached', () => {
    useConnection.setState({ status: 'online', usage: { ...limited, limited: false, remainingSeconds: 300 } });
    const { container } = render(
      <MemoryRouter>
        <RestScreen />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('pauses starting a new mission, says progress is saved, and explains how to get more time', async () => {
    useConnection.setState({ status: 'online', usage: limited });
    fakeServer({}); // the server is up (every other request is a plain 404)
    render(
      <MemoryRouter initialEntries={['/mission/m-water-path']}>
        <Routes>
          <Route path="/mission/:id" element={<MissionRunner />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Time for a rest', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText('Everything you did today is saved.')).toBeInTheDocument();
    expect(screen.getByText(/guardian can add more time/)).toBeInTheDocument();
  });

  it('never claims to track time offline', () => {
    useConnection.setState({ status: 'offline', usage: null });
    render(<UsageLine />);
    expect(screen.getByText('Daily time can only be tracked when SAJA is connected.')).toBeInTheDocument();
  });
});
