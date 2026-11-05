import type { L10n } from '@/domain/types';

export type QuranReviewStatus = 'draft' | 'internal_review' | 'scholar_review' | 'approved' | 'published';

export interface QuranWord {
  id: string; // e.g. "1:1:1"
  arabic: string;
  transliteration: string;
  translation: L10n;
  root: string | null;
  grammar: L10n;
  occurrenceCount?: number;
}

export interface QuranAyah {
  number: number;
  surahNumber: number;
  arabic: string;
  transliteration: string;
  translation: L10n;
  words: QuranWord[];
  tafsir: L10n;
  reflectionTheme: L10n;
}

export interface QuranSurah {
  id: string;
  number: number;
  name: L10n;
  titleMeaning: L10n;
  revelationPlace: 'makkah' | 'madinah';
  ayahsCount: number;
  orderInMushaf: number;
  description: L10n;
  ayahs: QuranAyah[];
  sources: {
    mushaf: string;
    translation: string;
    tafsir: string;
    verificationNotice: string;
  };
  reviewStatus: QuranReviewStatus;
}

export interface VocabChallenge {
  id: string;
  word: QuranWord;
  options: { id: string; text: L10n; correct: boolean }[];
  hint: L10n;
}

export interface AyahBuilderPuzzle {
  ayahNumber: number;
  targetArabic: string;
  scrambledWords: { id: string; arabic: string; correctIndex: number }[];
  translation: L10n;
}
