/** Shapes returned by the SAJA server (kept in one place so screens don't guess). */
import type { AgeBand, CharacterLook, GoalId, Level, Locale, Modality, Purpose, TopicId } from '@/domain/types';
import type { ParentalSettings } from '@/domain/safety';

export type Role = 'learner' | 'guardian' | 'mentor' | 'scholar' | 'moderator' | 'admin';
export type Consent = 'not_required' | 'pending' | 'granted' | 'revoked';
export type MemoryPrefs = { style: boolean; topics: boolean; schedule: boolean; conversations: boolean };

export type AiState = 'offline' | 'unverified' | 'available' | 'fallback' | 'unavailable';

export interface SystemStatus {
  ok: true;
  environment: 'development' | 'production' | 'test';
  modes: {
    database: 'postgres' | 'pglite' | 'pglite-memory';
    ai: 'provider' | 'demo';
    embeddings: 'gemini' | 'voyage' | 'local-lexical';
    ocr: 'provider-vision' | 'unavailable';
    transcription: 'remote' | 'provider-audio' | 'unavailable';
    frameOcr: 'provider-video' | 'ffmpeg+vision' | 'unavailable';
    push: 'web-push' | 'disabled';
    email: 'smtp' | 'dev-outbox';
  };
  /** Live AI state from real calls: 'available' only after a request actually succeeded. */
  ai: { state: AiState };
  push: { mode: string; publicKey: string | null };
  content: { reviewed: boolean; publishedDocuments: number; demoDocuments: number; note: string };
}

export interface ServerProfile {
  display_name: string;
  locale: Locale;
  purpose: Purpose;
  level: Level;
  modality: Modality;
  goals: GoalId[];
  interests: TopicId[];
  character: CharacterLook;
  onboarding_completed_at: string | null;
  created_at: string;
}

export interface Me {
  user: {
    id: string;
    email: string | null;
    isGuest: boolean;
    roles: Role[];
    ageBand: AgeBand;
    age: { declared: AgeBand | null; approved: AgeBand | null; consent: Consent };
    communityAllowed: boolean;
    parental: ParentalSettings;
    memory: MemoryPrefs;
  };
  profile: ServerProfile | null;
}

export interface ServerProgress {
  completed: string[];
  results: { mission_id: string; completed_at: string; mistakes: number; hints: number; modality: Modality; helper_modality: Modality | null; duration_ms: number }[];
  achievements: { id: string; kind: string; mission_id: string | null; location_id: string | null; earned_at: string }[];
  world: { location: string; visited: string[] };
  unlocked: string[];
}

export interface ServerNotification {
  id: string;
  category: string;
  title: { en: string; ar: string };
  body: { en: string; ar: string };
  url: string | null;
  status: 'scheduled' | 'delivered' | 'read' | 'failed';
  scheduled_for: string;
  delivered_at: string | null;
  read_at: string | null;
}

export interface UsageStatus {
  enforced: boolean;
  limitMinutes: number;
  extraMinutes: number;
  usedSeconds: number;
  remainingSeconds: number;
  limited: boolean;
  date: string;
}
