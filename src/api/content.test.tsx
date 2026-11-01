import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useConnection } from '@/store/connection';
import { useSettings } from '@/store/settings';
import { fakeServer, offlineFetch } from '@/test/server';
import { fetchKnowledge, refreshKnowledge, resetContentSession } from './content';
import { EvidencePanel } from '@/features/trust/EvidencePanel';
import { KNOWLEDGE_BY_ID } from '@/content/knowledge';

const serverDoc = (version: number, simple: string, status: 'demo' | 'published') => ({
  id: 'k-wudu',
  version,
  topics: ['purification'],
  confidence: 'consensus',
  status,
  isDemo: status === 'demo',
  content: { question: { en: 'How is wudu done?', ar: 'كيف يكون الوضوء؟' }, simple: { en: simple, ar: simple }, deep: { en: '', ar: '' }, example: { en: '', ar: '' }, why: { en: 'why', ar: 'why' }, context: { en: 'ctx', ar: 'ctx' }, keywords: [] },
  evidence: [{ kind: 'quran', ref: "Qur'an 5:6", text: { en: 'wash your faces', ar: '' }, rendering: 'translation', translationName: 'Saheeh International' }],
  provenance: { origin: status === 'demo' ? 'seed-demo' : 'staff-edit' },
  changeNote: null,
  reviews: status === 'published' ? [{ fromStatus: 'scholar_review', toStatus: 'approved', reviewerRole: 'verified_scholar', scope: 'wudu steps', at: '2026-09-01T00:00:00Z', scholar: { id: 's1', name: 'Dr. Example', verification: 'verified' } }, { fromStatus: 'approved', toStatus: 'published', reviewerRole: 'admin', scope: 'publish', at: '2026-09-02T00:00:00Z', scholar: null }] : [],
});

beforeEach(() => {
  resetContentSession();
  useSettings.setState({ locale: 'en' });
});
afterEach(() => {
  cleanup();
  useConnection.setState({ status: 'offline', me: null });
  offlineFetch();
});

describe('server-authoritative content', () => {
  it('pins the first version a person received for the rest of the session', async () => {
    const calls = fakeServer({ '/knowledge/k-wudu*': () => [200, serverDoc(3, 'Version three', 'published')] });
    expect((await fetchKnowledge('k-wudu'))?.provenance.version).toBe(3);
    await fetchKnowledge('k-wudu'); // cached: no second request
    expect(calls).toHaveLength(1);
    refreshKnowledge('k-wudu');
    const again = await fetchKnowledge('k-wudu');
    expect(again?.entry.simple.en).toBe('Version three');
    // Re-reading asks for the version this session already has, even if a newer one was published meanwhile.
    expect(calls.map((c) => c.url)).toEqual(['/api/knowledge/k-wudu', '/api/knowledge/k-wudu?version=3']);
  });

  it('online, the evidence panel shows the server version and who reviewed it', async () => {
    useConnection.setState({ status: 'online' });
    fakeServer({ '/knowledge/k-wudu*': () => [200, serverDoc(3, 'Reviewed wording from the server', 'published')] });
    render(
      <MemoryRouter>
        <EvidencePanel entry={KNOWLEDGE_BY_ID['k-wudu']} defaultOpen />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Reviewed wording from the server')).toBeInTheDocument();
    expect(screen.getByText(/SAJA’s library, version 3/)).toBeInTheDocument();
    expect(screen.getByText(/Approved by Dr. Example \(verified scholar\) for: wudu steps/)).toBeInTheDocument();
    expect(screen.queryByText('Demo content · not yet scholar-reviewed')).toBeNull();
  });

  it('offline, it uses the bundled copy and says so — never passing it off as reviewed', async () => {
    useConnection.setState({ status: 'offline' });
    render(
      <MemoryRouter>
        <EvidencePanel entry={KNOWLEDGE_BY_ID['k-wudu']} defaultOpen />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Offline copy bundled with the app/)).toBeInTheDocument();
    expect(screen.getAllByText(/not yet reviewed by a scholar/).length).toBeGreaterThan(0);
  });
});
