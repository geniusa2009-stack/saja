/**
 * Static content provenance inventory. This does not publish, approve or grade
 * religious text. Reviewers must check exact source snapshots in the staff ledger.
 */
import { KNOWLEDGE } from '../src/content/knowledge.ts';
import { HADITHS } from '../src/content/hadith.ts';
import { HADITH_ACTIVITIES } from '../src/content/hadithActivities.ts';
import { SIDE_STORIES } from '../src/content/sideStories.ts';

type Entry = {
  type: 'knowledge' | 'hadith';
  id: string;
  localStatus: string;
  sourceRefs: string[];
  directSourceUrls: string[];
  requiresSpecialistReview: boolean;
};
const knowledge: Entry[] = KNOWLEDGE.map((k) => ({
  type: 'knowledge',
  id: k.id,
  localStatus: k.reviewStatus,
  sourceRefs: k.evidence.map((e) => e.ref),
  directSourceUrls: [],
  requiresSpecialistReview: true,
}));
const hadith: Entry[] = HADITHS.map((h) => ({
  type: 'hadith',
  id: h.id,
  localStatus: h.reviewStatus,
  sourceRefs: [h.source.reference],
  directSourceUrls: [h.source.url],
  requiresSpecialistReview: true,
}));
const entries = [...knowledge, ...hadith];
const report = {
  warning: 'Code snapshot inventory only. Server publication status MUST be read from staff /api/content/status. No entry is approved by this report.',
  summary: {
    knowledge: knowledge.length,
    hadith: hadith.length,
    originalHadithActivities: HADITH_ACTIVITIES.length,
    fictionalStories: SIDE_STORIES.length,
    entriesRequiringSpecialistReview: entries.filter((e) => e.requiresSpecialistReview).length,
    entriesWithoutReferences: entries.filter((e) => e.sourceRefs.length === 0).length,
    statusCounts: Object.fromEntries([...new Set(entries.map((e) => e.localStatus))].map(
      (status) => [status, entries.filter((e) => e.localStatus === status).length],
    )),
  },
  entries,
};
process.stdout.write(JSON.stringify(report, null, 2));
