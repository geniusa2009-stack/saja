import { render, screen, cleanup, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HADITHS } from '@/content/hadith';
import { hadithSnapshot } from '@/domain/hadith';
import { resetHadithSession } from '@/api/hadith';
import { useConnection } from '@/store/connection';
import { useHadith } from '@/store/hadith';
import { useSettings } from '@/store/settings';
import { fakeServer, offlineFetch } from '@/test/server';
import HadithLibrary from './HadithLibrary';
import HadithDetail from './HadithDetail';
import Discover from './Discover';
import ActivityPlayer from './ActivityPlayer';

function renderAt(path: string, element: React.ReactNode, route = path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useSettings.setState({ locale: 'en' });
  useConnection.setState({ status: 'offline', me: null });
  useHadith.getState().reset();
  resetHadithSession();
});
afterEach(() => {
  cleanup();
  offlineFetch();
  useHadith.getState().reset();
  resetHadithSession();
  useConnection.setState({ status: 'connecting', me: null });
});

describe('hadith library', () => {
  it('shows the Arabic first, the source, the demo label and all filters', async () => {
    renderAt('/hadith', <HadithLibrary />);
    expect(await screen.findByRole('heading', { name: 'Words that stayed' })).toBeInTheDocument();
    expect(screen.getAllByText(/Sahih al-Bukhari · 1/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Source' })[0]).toHaveAttribute('href', 'https://sunnah.com/bukhari:1');
    expect(screen.getByLabelText('Search hadith by word, narrator, theme or reference')).toBeInTheDocument();
    expect(screen.getByText(/Offline demo: these records are bundled/)).toBeInTheDocument();
    expect(screen.getAllByText('Demo').length).toBeGreaterThan(0);
  });

  it('searches by meaning and Arabic, and filters by collection and age', async () => {
    const user = userEvent.setup();
    renderAt('/hadith', <HadithLibrary />);
    await screen.findAllByText(/11 hadith in the library/);

    const search = screen.getByLabelText('Search hadith by word, narrator, theme or reference');
    await user.type(search, 'intention');
    expect(await screen.findByRole('heading', { name: '1 hadith in the library' })).toBeInTheDocument();
    await user.clear(search);

    await user.click(screen.getByRole('button', { name: 'Sahih Muslim' }));
    expect(await screen.findByRole('heading', { name: '1 hadith in the library' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'All' })[1]!);

    // The Arabic search folds diacritics, so a phone keyboard without them still finds the matn.
    await user.type(search, 'الاعمال');
    expect(await screen.findByText('Actions and intentions')).toBeInTheDocument();
  });

  it('saves a hadith without touching mission progress', async () => {
    const user = userEvent.setup();
    renderAt('/hadith', <HadithLibrary />);
    await screen.findByText('Actions and intentions');
    await user.click(screen.getByRole('button', { name: 'Save Actions and intentions' }));
    expect(useHadith.getState().saved).toEqual(['h-bukhari-1']);
    await user.click(screen.getByRole('button', { name: /Saved only/ }));
    expect(await screen.findByRole('heading', { name: '1 hadith in the library' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('The tongue and the hand')).toBeNull());
  });

  it('renders the library in Arabic, right-to-left', async () => {
    useSettings.setState({ locale: 'ar' });
    renderAt('/hadith', <HadithLibrary />);
    expect(await screen.findByRole('heading', { name: 'كلمات باقية' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'صحيح البخاري' })).toBeInTheDocument();
  });

  it('shows a scholar-approved badge only when the server publishes that exact snapshot', async () => {
    useConnection.setState({ status: 'online', me: null });
    fakeServer({
      '/hadith': () => [
        200,
        {
          items: [
            {
              id: HADITHS[0].id,
              version: 2,
              content: hadithSnapshot(HADITHS[0]),
              reviews: [{ fromStatus: 'approved', toStatus: 'published', reviewerRole: 'admin', scope: 'full text', at: new Date().toISOString(), scholar: null }],
            },
          ],
          demo: HADITHS.slice(1).map((h) => h.id),
        },
      ],
    });
    renderAt('/hadith', <HadithLibrary />);
    expect((await screen.findAllByText('Scholar-approved')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Demo').length).toBeGreaterThan(0);
  });
});

describe('hadith detail', () => {
  it('keeps the Arabic, reference, grading and provenance in view', async () => {
    renderAt('/hadith/h-bukhari-1', <HadithDetail />, '/hadith/:id');
    expect(await screen.findByRole('heading', { name: 'Actions and intentions' })).toBeInTheDocument();
    expect(screen.getByText(/الأَعْمَالُ/)).toBeInTheDocument();
    expect(screen.getAllByText('Sahih al-Bukhari 1').length).toBeGreaterThan(0);
    expect(screen.getByText(/Sunnah.com does not print a separate grade/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Grading & provenance' })).toBeInTheDocument();
    expect(screen.getByText(/No scholar review is recorded for this snapshot/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Check the Arabic and grading on Sunnah.com/ })[0]).toHaveAttribute('href', 'https://sunnah.com/bukhari:1');
    expect(screen.getByRole('button', { name: /Why does intention matter\?/ })).toBeInTheDocument();
  });

  it('marks the hadith explored and toggles the save label', async () => {
    const user = userEvent.setup();
    renderAt('/hadith/h-bukhari-1', <HadithDetail />, '/hadith/:id');
    await screen.findByRole('heading', { name: 'Actions and intentions' });
    expect(useHadith.getState().explored).toContain('h-bukhari-1');
    await user.click(screen.getByRole('button', { name: 'Save Actions and intentions' }));
    expect(useHadith.getState().saved).toContain('h-bukhari-1');
    expect(useHadith.getState().saved).not.toContain('k-intention');
  });

  it('says plainly when a hadith is not in the library', async () => {
    renderAt('/hadith/h-missing', <HadithDetail />, '/hadith/:id');
    expect((await screen.findAllByText('This hadith is not in the library.')).length).toBeGreaterThan(0);
  });
});

describe('hadith discovery', () => {
  it('lists the six original activities and states they are not hadith', async () => {
    renderAt('/hadith/discover', <Discover />);
    expect(await screen.findByRole('heading', { name: 'Learning by exploring' })).toBeInTheDocument();
    expect(screen.getByText('The new neighbour')).toBeInTheDocument();
    expect(screen.getByText('The two lamps')).toBeInTheDocument();
    expect(screen.getAllByText('Original SAJA activity · not a hadith').length).toBe(6);
    expect(screen.getByText(/No scores, no streaks, no measure of faith/)).toBeInTheDocument();
  });

  it('plays a scenario, gives feedback, finishes without a score and links back to the hadith', async () => {
    const user = userEvent.setup();
    renderAt('/hadith/discover/scenario-new-neighbour', <ActivityPlayer />, '/hadith/discover/:activityId');
    expect(await screen.findByRole('heading', { name: 'The new neighbour' })).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Choose a response' });
    await user.click(within(group).getAllByRole('button')[0]!);
    expect(screen.getByText(/A small, practical help can make a new place feel safer/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(within(screen.getByRole('group', { name: 'Choose a response' })).getAllByRole('button')[0]!);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(within(screen.getByRole('group', { name: 'Choose a response' })).getAllByRole('button')[0]!);
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(await screen.findByText('You explored this activity')).toBeInTheDocument();
    expect(screen.getByText(/Nothing was scored/)).toBeInTheDocument();
    expect(useHadith.getState().completed).toContain('scenario-new-neighbour');
    expect(screen.getByRole('button', { name: 'Read the hadith' })).toBeInTheDocument();
  });

  it('keeps a reflection on this device only and never posts it', async () => {
    const user = userEvent.setup();
    const calls = fakeServer({});
    renderAt('/hadith/discover/reflection-mercy', <ActivityPlayer />, '/hadith/discover/:activityId');
    expect(await screen.findByText(/Private to this device/)).toBeInTheDocument();
    const boxes = screen.getAllByRole('textbox');
    await user.type(boxes[0]!, 'I want to be gentler at home.');
    await user.click(screen.getByRole('button', { name: 'Keep this reflection' }));
    expect(await screen.findByText('You explored this activity')).toBeInTheDocument();
    const kept = useHadith.getState().reflections;
    expect(kept).toHaveLength(1);
    expect(kept[0]!.lines).toEqual(['I want to be gentler at home.']);
    expect(calls.filter((c) => c.method !== 'GET')).toEqual([]);
  });

  it('flips a review card to reveal the answer and its reference', async () => {
    const user = userEvent.setup();
    renderAt('/hadith/discover/review-foundations', <ActivityPlayer />, '/hadith/discover/:activityId');
    expect(await screen.findByText(/Card 1 of 6/)).toBeInTheDocument();
    const card = screen.getByRole('button', { name: /Question/ });
    await user.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Answer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide the answer' })).toBeInTheDocument();
  });
});
