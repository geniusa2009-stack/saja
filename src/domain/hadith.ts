/**
 * The Hadith learning domain. Pure data and helpers — no React, storage or network.
 *
 * SAFETY RULES ENCODED HERE:
 *  - A hadith's Arabic text, reference and source URL are never generated at runtime.
 *  - The English is explicitly a SAJA *meaning explanation*, never sold as a
 *    published translation.
 *  - Bundled content starts as `demo-unreviewed`. Only the server's review overlay
 *    can present an exact, published version as scholar-approved.
 *  - Activities are original SAJA learning experiences and must never be confused
 *    with hadith text.
 */
import type { AgeBand, L10n, TopicId } from './types';

export type HadithCollection = 'bukhari' | 'muslim' | 'tirmidhi';

/** Status shown to a learner. The server decides `published`; code defaults to demo. */
export type HadithServingStatus = 'demo' | 'published';

export type HadithReviewStage = 'draft' | 'internal_review' | 'scholar_review' | 'approved' | 'published' | 'archived';

export interface HadithGrading {
  /** The grade as published at the source, e.g. "Hasan (Darussalam)". */
  label: L10n;
  /** Who published or classified this grade. Never "SAJA". */
  authority: string;
  sourceUrl: string;
  /** What the grade does and does not claim. */
  note: L10n;
}

export interface HadithSource {
  collection: L10n;
  collectionArabic: string;
  number: string;
  reference: string;
  inBookReference: string;
  /** Direct deep link, so a reader can check the Arabic and grading themselves. */
  url: string;
  arabicEdition: string;
}

export interface HadithVocabulary {
  arabic: string;
  transliteration: string;
  meaning: L10n;
}

export interface HadithRecord {
  /** Stable id, also used by the content-review ledger. */
  id: string;
  title: L10n;
  narrator: L10n;
  collection: HadithCollection;
  source: HadithSource;
  /** Verified Arabic matn from the cited source (isnad omitted, not paraphrased). */
  arabic: string;
  /** SAJA's own paraphrase of the meaning — not a published translation. */
  meaning: L10n;
  explanation: L10n;
  context: L10n;
  why: L10n;
  vocabulary: HadithVocabulary[];
  topics: TopicId[];
  ageBands: AgeBand[];
  grading: HadithGrading;
  englishMeaning: {
    kind: 'saja-paraphrase';
    note: L10n;
  };
  relatedKnowledge: string[];
  relatedHadith: string[];
  keywords: string[];
  /** Every bundled record is demo until the server publishes an exact reviewed snapshot. */
  reviewStatus: 'demo-unreviewed';
}

/** The exact, learner-visible snapshot that goes through the review ledger. Status is never part of it. */
export type HadithSnapshot = Omit<HadithRecord, 'reviewStatus'>;

export interface HadithFilters {
  query?: string;
  topic?: TopicId | 'all';
  ageBand?: AgeBand | 'all';
  collection?: HadithCollection | 'all';
  savedOnly?: boolean;
  saved?: readonly string[];
}

/** Build the snapshot reviewed and published by the server. No status is baked into religious content. */
export function hadithSnapshot(record: HadithRecord): HadithSnapshot {
  const { reviewStatus: _reviewStatus, ...snapshot } = record;
  return snapshot;
}

/* ── Search and filters ────────────────────────────────────── */

const ARABIC_MARKS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g;

/** Folds Arabic diacritics and common letter variants so search works on a phone keyboard. */
export function normalizeHadithText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(ARABIC_MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function hadithSearchText(record: HadithRecord): string {
  const bilingual = (value: L10n) => `${value.en} ${value.ar}`;
  return normalizeHadithText(
    [
      bilingual(record.title),
      bilingual(record.narrator),
      bilingual(record.meaning),
      bilingual(record.explanation),
      bilingual(record.context),
      bilingual(record.why),
      record.arabic,
      record.source.reference,
      bilingual(record.source.collection),
      bilingual(record.grading.label),
      record.grading.authority,
      record.keywords.join(' '),
      ...record.vocabulary.flatMap((v) => [v.arabic, v.transliteration, bilingual(v.meaning)]),
    ].join(' '),
  );
}

export function filterHadith(records: readonly HadithRecord[], filters: HadithFilters = {}): HadithRecord[] {
  const needle = normalizeHadithText(filters.query ?? '');
  const saved = new Set(filters.saved ?? []);
  return records.filter((record) => {
    if (filters.topic && filters.topic !== 'all' && !record.topics.includes(filters.topic)) return false;
    if (filters.ageBand && filters.ageBand !== 'all' && !record.ageBands.includes(filters.ageBand)) return false;
    if (filters.collection && filters.collection !== 'all' && record.collection !== filters.collection) return false;
    if (filters.savedOnly && !saved.has(record.id)) return false;
    return !needle || hadithSearchText(record).includes(needle);
  });
}

/* ── Integrity checks (used by tests and future editorial tooling) ───── */

export function hadithIntegrityIssues(records: readonly HadithRecord[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) issues.push(`${record.id}: duplicate id`);
    ids.add(record.id);
    if (!/^h-[a-z0-9-]+$/.test(record.id)) issues.push(`${record.id}: unstable id`);
    if (!record.arabic.trim()) issues.push(`${record.id}: missing Arabic matn`);
    if (!record.meaning.en.trim() || !record.meaning.ar.trim()) issues.push(`${record.id}: missing meaning in a language`);
    if (!record.explanation.en.trim() || !record.explanation.ar.trim()) issues.push(`${record.id}: missing explanation in a language`);
    if (!record.source.reference.trim()) issues.push(`${record.id}: missing reference`);
    if (!record.source.url.startsWith('https://sunnah.com/')) issues.push(`${record.id}: source URL must be a direct Sunnah.com link`);
    if (!record.source.url.endsWith(`/${record.collection}:${record.source.number}`)) issues.push(`${record.id}: source URL does not match collection and number`);
    if (!record.grading.authority.trim()) issues.push(`${record.id}: missing grading authority`);
    if (!record.grading.note.en.trim() || !record.grading.note.ar.trim()) issues.push(`${record.id}: missing grading note`);
    if (record.englishMeaning.kind !== 'saja-paraphrase') issues.push(`${record.id}: English meaning must be a SAJA paraphrase`);
    if (record.reviewStatus !== 'demo-unreviewed') issues.push(`${record.id}: bundled content must start unreviewed`);
    if (!record.ageBands.length) issues.push(`${record.id}: no age suitability`);
  }
  for (const record of records) {
    for (const id of record.relatedHadith) {
      if (!ids.has(id)) issues.push(`${record.id}: related hadith ${id} does not exist`);
      if (id === record.id) issues.push(`${record.id}: relates to itself`);
    }
  }
  return issues;
}

const COLLECTIONS: readonly HadithCollection[] = ['bukhari', 'muslim', 'tirmidhi'];
const TOPIC_IDS: readonly TopicId[] = ['prayer', 'purification', 'quran', 'character', 'beliefs', 'terminology', 'fasting', 'history'];
const AGE_BANDS: readonly AgeBand[] = ['child', 'teen', 'adult'];

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isL10nValue = (v: unknown): v is L10n => isObject(v) && isText(v.en) && isText(v.ar);

/**
 * Accepts only a complete, well-formed published snapshot from the server.
 * A malformed or partial overlay must never turn bundled demo content into
 * something the UI presents as scholar-reviewed.
 */
export function hadithFromSnapshot(id: string, value: unknown): HadithRecord | null {
  if (!/^h-[a-z0-9-]+$/.test(id) || !isObject(value)) return null;
  const v = value;
  if (v.id !== id || !COLLECTIONS.includes(v.collection as HadithCollection)) return null;
  if (!isL10nValue(v.title) || !isL10nValue(v.narrator) || !isText(v.arabic)) return null;
  if (![v.meaning, v.explanation, v.context, v.why].every(isL10nValue)) return null;

  if (!isObject(v.source)) return null;
  const source = v.source;
  if (!isL10nValue(source.collection) || !isText(source.collectionArabic) || !isText(source.number)) return null;
  if (!isText(source.reference) || !isText(source.inBookReference) || !isText(source.arabicEdition)) return null;
  if (!isText(source.url) || source.url !== `https://sunnah.com/${v.collection}:${source.number}`) return null;

  if (!Array.isArray(v.vocabulary) || !v.vocabulary.every((x) => isObject(x) && isText(x.arabic) && isText(x.transliteration) && isL10nValue(x.meaning))) return null;
  if (!Array.isArray(v.topics) || !v.topics.length || !v.topics.every((x) => TOPIC_IDS.includes(x as TopicId))) return null;
  if (!Array.isArray(v.ageBands) || !v.ageBands.length || !v.ageBands.every((x) => AGE_BANDS.includes(x as AgeBand))) return null;
  if (!Array.isArray(v.relatedKnowledge) || !v.relatedKnowledge.every(isText)) return null;
  if (!Array.isArray(v.relatedHadith) || !v.relatedHadith.every(isText)) return null;
  if (!Array.isArray(v.keywords) || !v.keywords.every(isText)) return null;

  if (!isObject(v.grading) || !isL10nValue(v.grading.label) || !isText(v.grading.authority) || !isText(v.grading.sourceUrl) || !isL10nValue(v.grading.note)) return null;
  if (!isObject(v.englishMeaning) || v.englishMeaning.kind !== 'saja-paraphrase' || !isL10nValue(v.englishMeaning.note)) return null;

  return { ...(v as unknown as HadithSnapshot), reviewStatus: 'demo-unreviewed' };
}

/* ── Learning activities ───────────────────────────────────── */

export type HadithActivityKind = 'scenario' | 'match' | 'story' | 'sort' | 'reflection' | 'review';

interface ActivityBase {
  id: string;
  kind: HadithActivityKind;
  title: L10n;
  summary: L10n;
  hadithIds: string[];
  ageBands: AgeBand[];
  minutes: number;
}

export interface ScenarioChoice {
  id: string;
  label: L10n;
  feedback: L10n;
  /** `gentle` choices are the ones the hadith's principle points toward; `pause` is a softer alternative, never shamed. */
  tone: 'gentle' | 'pause';
}

export interface ScenarioStep {
  id: string;
  prompt: L10n;
  choices: ScenarioChoice[];
}

export interface ScenarioActivity extends ActivityBase {
  kind: 'scenario';
  label: L10n;
  scenario: L10n;
  steps: ScenarioStep[];
}

export interface MatchActivity extends ActivityBase {
  kind: 'match';
  pairs: { id: string; arabic: string; transliteration: string; meaning: L10n }[];
}

export interface StoryPage {
  title: L10n;
  body: L10n;
}

export interface StoryActivity extends ActivityBase {
  kind: 'story';
  label: L10n;
  pages: StoryPage[];
  /** Explicitly states that this is SAJA's story, not a hadith. */
  disclosure: L10n;
}

export type SortCategory = 'hadith' | 'explanation' | 'scenario';

export interface SortActivity extends ActivityBase {
  kind: 'sort';
  items: { id: string; text: L10n; correct: SortCategory; why: L10n }[];
}

export interface ReflectionActivity extends ActivityBase {
  kind: 'reflection';
  prompts: L10n[];
}

export interface ReviewCard {
  id: string;
  prompt: L10n;
  answer: L10n;
  reference: string;
}

export interface ReviewActivity extends ActivityBase {
  kind: 'review';
  cards: ReviewCard[];
}

export type HadithActivity = ScenarioActivity | MatchActivity | StoryActivity | SortActivity | ReflectionActivity | ReviewActivity;
