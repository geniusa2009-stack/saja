import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useSettings } from '@/store/settings';
import { useProfile } from '@/store/profile';
import { DEFAULT_LOOK } from '@/features/character/palette';
import QuranOdyssey from './QuranOdyssey';

beforeEach(() => {
  useSettings.setState({ locale: 'en' });
  useProfile.setState({
    profile: {
      name: 'Maryam',
      look: DEFAULT_LOOK,
      purpose: 'learn-more',
      ageBand: 'adult',
      level: 'confident',
      goals: ['quran'],
      interests: ['quran'],
      modality: 'hands-on',
      createdAt: Date.now(),
    },
  });
});

afterEach(() => {
  cleanup();
});

describe('Quran Odyssey · Surah Al-Fatiha Milestone', () => {
  it('renders Surah Al-Fatiha title and description respectfully in both languages', () => {
    render(
      <MemoryRouter>
        <QuranOdyssey />
      </MemoryRouter>
    );

    expect(screen.getByText('الفَاتِحَة')).toBeInTheDocument();
    expect(screen.getAllByText('The Opening')[0]).toBeInTheDocument();
    expect(screen.getByText(/The greatest Surah in the Qur’an/)).toBeInTheDocument();
  });

  it('displays all 7 authentic verses in Uthmani calligraphy with translations', () => {
    render(
      <MemoryRouter>
        <QuranOdyssey />
      </MemoryRouter>
    );

    // Verify first and last verse are present
    expect(screen.getByText('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ')).toBeInTheDocument();
    expect(screen.getByText(/In the name of Allah, the Entirely Merciful/)).toBeInTheDocument();

    // Verify ayah 7
    expect(screen.getByText(/The path of those upon whom You have bestowed favor/)).toBeInTheDocument();
  });

  it('allows selecting an Arabic word to inspect root, grammar, and translation', () => {
    render(
      <MemoryRouter>
        <QuranOdyssey />
      </MemoryRouter>
    );

    // Click word "ٱلْحَمْدُ"
    const hamdWord = screen.getByText('ٱلْحَمْدُ');
    fireEvent.click(hamdWord);

    // Word inspector displays transliteration and root
    expect(screen.getByText('al-Ḥamdu')).toBeInTheDocument();
    expect(screen.getByText('[ ح م د ]')).toBeInTheDocument();
    expect(screen.getAllByText(/\[All\] praise/i).length).toBeGreaterThanOrEqual(1);
  });

  it('switches to Vocabulary Challenge mode and handles quiz interaction', () => {
    render(
      <MemoryRouter>
        <QuranOdyssey />
      </MemoryRouter>
    );

    // Click tab "Word Treasure"
    const vocabTab = screen.getByRole('tab', { name: /Word Treasure/i });
    fireEvent.click(vocabTab);

    // Verify prompt is visible
    expect(screen.getByText(/What is the precise meaning/i)).toBeInTheDocument();

    // Answer the first question (ٱلْحَمْدُ -> [All] praise and gratitude)
    const correctOption = screen.getByRole('button', { name: /\[All\] praise and gratitude/i });
    fireEvent.click(correctOption);

    // Verify feedback
    expect(screen.getByText(/Masha’Allah! Correct/i)).toBeInTheDocument();
  });

  it('switches to Ayah Builder mode and allows assembling verse words in sacred order', () => {
    render(
      <MemoryRouter>
        <QuranOdyssey />
      </MemoryRouter>
    );

    // Click tab "Ayah Builder"
    const builderTab = screen.getByRole('tab', { name: /Ayah Builder/i });
    fireEvent.click(builderTab);

    expect(screen.getByText(/Tap the words from the bank below/i)).toBeInTheDocument();

    // Click words in correct order: بِسْمِ -> ٱللَّهِ -> ٱلرَّحْمَٰنِ -> ٱلرَّحِيمِ
    fireEvent.click(screen.getByRole('button', { name: 'بِسْمِ' }));
    fireEvent.click(screen.getByRole('button', { name: 'ٱللَّهِ' }));
    fireEvent.click(screen.getByRole('button', { name: 'ٱلرَّحْمَٰنِ' }));
    fireEvent.click(screen.getByRole('button', { name: 'ٱلرَّحِيمِ' }));

    // Verify completion
    expect(screen.getByText(/Masha’Allah! Verse assembled/i)).toBeInTheDocument();
  });

  it('displays Tafsir and contemplation themes for all 7 verses', () => {
    render(
      <MemoryRouter>
        <QuranOdyssey />
      </MemoryRouter>
    );

    const tafsirTab = screen.getByRole('tab', { name: /Tafsir & Meaning/i });
    fireEvent.click(tafsirTab);

    expect(screen.getByText(/Beginning with Divine Grace & Mercy/i)).toBeInTheDocument();
    expect(screen.getByText(/Pure Devotion & Radical Reliance/i)).toBeInTheDocument();
    expect(screen.getByText(/The Essential Prayer for Guidance/i)).toBeInTheDocument();
  });

  it('displays transparent review safeguards and authentic source citations', () => {
    render(
      <MemoryRouter>
        <QuranOdyssey />
      </MemoryRouter>
    );

    // Religious disclaimer
    expect(screen.getByText(/Demo Content: Quranic Arabic text is verified against standard Hafs/i)).toBeInTheDocument();

    // Sources footer
    expect(screen.getByText(/King Fahd Complex for the Printing of the Holy Quran/i)).toBeInTheDocument();
    expect(screen.getByText(/Saheeh International/i)).toBeInTheDocument();
    expect(screen.getByText(/Tafsir al-Muyassar/i)).toBeInTheDocument();
  });
});
