import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from '@/domain/types';
import type { AsrSchool, MethodId } from '@/domain/prayerTimes';
import { KEY, storage } from './storage';

export type MotionPref = 'system' | 'reduced' | 'full';

export interface PrayerPlace {
  cityId?: string;
  custom?: { lat: number; lng: number; timeZone: string; label: string };
}

interface SettingsState {
  locale: Locale;
  motion: MotionPref;
  introSeenAt: number | null;
  prayerPlace: PrayerPlace;
  method: MethodId | 'auto';
  asr: AsrSchool;
  prayerReminders: boolean;
  adhanVoice: 'silent' | 'beautiful' | 'short' | 'classic';
  focusMode: boolean;
  setLocale: (l: Locale) => void;
  setMotion: (m: MotionPref) => void;
  markIntroSeen: () => void;
  setPrayerPlace: (p: PrayerPlace) => void;
  setMethod: (m: MethodId | 'auto') => void;
  setAsr: (a: AsrSchool) => void;
  setPrayerReminders: (b: boolean) => void;
  setAdhanVoice: (v: SettingsState['adhanVoice']) => void;
  setFocusMode: (b: boolean) => void;
}

const guessLocale = (): Locale => {
  try {
    return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  } catch {
    return 'en';
  }
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      locale: guessLocale(),
      motion: 'system',
      introSeenAt: null,
      prayerPlace: { cityId: 'makkah' },
      method: 'auto',
      asr: 'standard',
      prayerReminders: true,
      adhanVoice: 'silent',
      focusMode: false,
      setLocale: (locale) => set({ locale }),
      setMotion: (motion) => set({ motion }),
      markIntroSeen: () => set({ introSeenAt: Date.now() }),
      setPrayerPlace: (prayerPlace) => set({ prayerPlace }),
      setMethod: (method) => set({ method }),
      setAsr: (asr) => set({ asr }),
      setPrayerReminders: (prayerReminders) => set({ prayerReminders }),
      setAdhanVoice: (adhanVoice) => set({ adhanVoice }),
      setFocusMode: (focusMode) => set({ focusMode }),
    }),
    { name: KEY('settings'), storage },
  ),
);
