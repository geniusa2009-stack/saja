/**
 * Core domain types for SAJA. Pure data — no React, no storage, no network.
 * Every user-facing string that belongs to *content* (not UI chrome) is an L10n
 * so that Arabic and English are first-class from day one.
 */

export type Locale = 'en' | 'ar';
export type L10n = Record<Locale, string>;

/* ── People ──────────────────────────────────────────────── */

export type Purpose = 'exploring' | 'new-muslim' | 'learn-more' | 'child';
export type AgeBand = 'child' | 'teen' | 'adult';
export type Level = 'beginner' | 'some' | 'confident';
/** How the learner prefers things explained. Also a signal the adaptive engine updates. */
export type Modality = 'hands-on' | 'visual' | 'story' | 'guided';

export type HairStyle = 'short' | 'curly' | 'long' | 'hijab' | 'kufi' | 'wrap';
export type Outfit = 'thobe' | 'abaya' | 'tunic' | 'hoodie' | 'jubba';
export type Accessory = 'none' | 'glasses' | 'scarf' | 'satchel' | 'lantern';

export interface CharacterLook {
  skin: number; // index into SKIN_TONES
  hair: HairStyle;
  hairColor: number; // index into HAIR_COLORS
  outfit: Outfit;
  outfitColor: number; // index into OUTFIT_COLORS
  accessory: Accessory;
}

export type GoalId = 'prayer' | 'quran' | 'basics' | 'character' | 'community' | 'consistency';
export type TopicId =
  | 'prayer'
  | 'purification'
  | 'quran'
  | 'character'
  | 'beliefs'
  | 'terminology'
  | 'fasting'
  | 'history';

export interface Profile {
  name: string;
  look: CharacterLook;
  purpose: Purpose;
  ageBand: AgeBand;
  level: Level;
  goals: GoalId[];
  interests: TopicId[];
  modality: Modality;
  createdAt: number;
}

/* ── World ───────────────────────────────────────────────── */

export type LocationId =
  | 'village'
  | 'mosque'
  | 'garden'
  | 'library'
  | 'house'
  | 'market'
  | 'desert'
  | 'reflection'
  | 'mountain';

export type UnlockRule =
  | { kind: 'start' }
  /** Unlocks once `count` missions are complete (optionally only counting a location). */
  | { kind: 'missions'; count: number; at?: LocationId };

export interface WorldLocation {
  id: LocationId;
  name: L10n;
  purpose: L10n;
  /** Short line the location "says" when you arrive. */
  arrival: L10n;
  topics: TopicId[];
  /** Position along the world path, 0..1 (left → right in LTR). */
  t: number;
  /** Vertical placement of the marker relative to the path, in world px. */
  lift: number;
  unlock: UnlockRule;
  chapter: number;
}

/* ── Missions ────────────────────────────────────────────── */

/** The interaction mechanic — never "question + four buttons". */
export type Mechanic =
  | 'wudu-journey' // move through a courtyard and use the right things in the right order
  | 'salah-path' // walk a guided path through the prayer, placing each movement
  | 'kindness-choice' // branching situation with consequences
  | 'clue-hunt' // find clues around a scene and reconstruct an answer
  | 'lantern-match' // connect terms to meanings by lighting lanterns
  | 'reflection' // quiet journaling mission
  | 'visual-explainer' // adaptive: illustrated step-through
  | 'story' // adaptive: narrated example
  | 'guided-retry'; // adaptive: scaffolded retry with Siraj

export interface MissionReward {
  kind: 'artifact' | 'badge' | 'item' | 'story';
  id: string;
  name: L10n;
}

export interface Mission {
  id: string;
  number: number;
  location: LocationId;
  title: L10n;
  summary: L10n;
  topic: TopicId;
  concept: string; // the core concept id this mission teaches (used by adaptation)
  mechanic: Mechanic;
  modality: Modality;
  minutes: number;
  difficulty: 1 | 2 | 3;
  knowledge: string[]; // knowledge entry ids for SHOW EVIDENCE
  reward: MissionReward;
  /** When true this mission only appears as an adaptive alternative. */
  adaptive?: boolean;
  /** Content suitable for Kids Mode. */
  kidSafe: boolean;
}

export interface MissionResult {
  missionId: string;
  completedAt: number;
  mistakes: number;
  hintsUsed: number;
  durationMs: number;
  mechanic: Mechanic;
  modality: Modality;
}

/* ── Knowledge & trust ───────────────────────────────────── */

export type Confidence = 'consensus' | 'majority' | 'difference' | 'review';

export type SourceKind = 'quran' | 'hadith' | 'scholarly';

export interface Evidence {
  kind: SourceKind;
  /** Canonical reference, e.g. "Qur'an 4:103" or "Sahih al-Bukhari 159". */
  ref: string;
  /** Translation or meaning. `translation` names the rendering; `meaning` marks a paraphrase. */
  text: L10n;
  rendering: 'translation' | 'meaning';
  translationName?: string;
  arabic?: string;
}

/** Review status of a content item. Everything shipped in this build is demo content. */
export type ReviewStatus = 'demo-unreviewed' | 'reviewed';

export interface KnowledgeEntry {
  id: string;
  topics: TopicId[];
  question: L10n;
  simple: L10n;
  deep: L10n;
  example: L10n;
  why: L10n;
  confidence: Confidence;
  evidence: Evidence[];
  context: L10n;
  uncertainty?: L10n;
  keywords: string[];
  reviewStatus: ReviewStatus;
}

/* ── Verification (AMANAH / NOUR) ────────────────────────── */

/** supported · needs-context · mismatch (source says otherwise) · unverified (no source found) · review (a human must decide). */
export type ClaimVerdict = 'supported' | 'needs-context' | 'mismatch' | 'unverified' | 'review';

export interface VerifiedClaim {
  id: string;
  text: string;
  verdict: ClaimVerdict;
  explanation: L10n;
  evidence: Evidence[];
  suggestion?: L10n;
}
