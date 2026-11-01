/**
 * Seeds curated DEMO content from src/content into the database.
 * Everything seeded here is flagged is_demo / review_status 'draft' — nothing is
 * marked reviewed or verified until a qualified human does so through the
 * review workflow.
 */
import type { Services } from '../context.ts';
import { one } from './index.ts';
import { KNOWLEDGE } from '../../src/content/knowledge.ts';
import { MISSIONS, WUDU_STEPS, SALAH_STEPS, MATCH_SETS, CHOICE_STORIES, CLUE_HUNTS, REFLECTION_PROMPTS } from '../../src/content/missions.ts';
import { LOCATION_BY_ID } from '../../src/content/world.ts';
import { CIRCLES, MEMBERS, seedMessages } from '../../src/content/community.ts';
import type { Evidence, KnowledgeEntry } from '../../src/domain/types.ts';
import { toPgVector } from '../ai/embeddings.ts';
import { buildMissionDefinition } from '../modules/missions/definitions.ts';

export function sourceIdFor(ref: string, kind: Evidence['kind']): string {
  if (kind === 'quran') return 'quran-saheeh-intl';
  if (/bukhari/i.test(ref)) return 'hadith-bukhari';
  if (/muslim/i.test(ref)) return 'hadith-muslim';
  if (/tirmidhi/i.test(ref)) return 'hadith-tirmidhi';
  if (/dawud/i.test(ref)) return 'hadith-abi-dawud';
  return 'historical-record';
}

const SOURCES = [
  ['quran-saheeh-intl', 'quran', "The Qur'an — Saheeh International translation", 'Saheeh International', 'en'],
  ['hadith-bukhari', 'hadith', 'Sahih al-Bukhari', null, 'ar'],
  ['hadith-muslim', 'hadith', 'Sahih Muslim', null, 'ar'],
  ['hadith-tirmidhi', 'hadith', "Jami' at-Tirmidhi", null, 'ar'],
  ['hadith-abi-dawud', 'hadith', 'Sunan Abi Dawud', null, 'ar'],
  ['historical-record', 'scholarly', 'Historical record (general)', null, 'en'],
] as const;

/** Chunks a knowledge entry into retrievable passages, each tied to its section and language. */
export function chunksFor(e: KnowledgeEntry) {
  const out: { language: 'en' | 'ar'; section: string; content: string; reference: string | null; sourceId: string | null }[] = [];
  for (const lang of ['en', 'ar'] as const) {
    out.push({ language: lang, section: 'answer', content: `${e.question[lang]}\n${e.simple[lang]}`, reference: null, sourceId: null });
    out.push({ language: lang, section: 'deep', content: e.deep[lang], reference: null, sourceId: null });
    out.push({ language: lang, section: 'example', content: e.example[lang], reference: null, sourceId: null });
    out.push({ language: lang, section: 'context', content: `${e.context[lang]}${e.uncertainty ? `\n${e.uncertainty[lang]}` : ''}`, reference: null, sourceId: null });
    for (const ev of e.evidence) out.push({ language: lang, section: 'evidence', content: `${ev.ref}: ${ev.text[lang]}`, reference: ev.ref, sourceId: sourceIdFor(ev.ref, ev.kind) });
  }
  return out;
}

export async function seed(s: Services) {
  const seeded = await one<{ n: number }>(s.db, 'select count(*)::int as n from knowledge_documents');
  if (seeded && seeded.n > 0) return;

  await s.db.tx(async (q) => {
    for (const [id, kind, title, publisher, language] of SOURCES) {
      await q.query('insert into knowledge_sources (id, kind, title, publisher, language, notes) values ($1,$2,$3,$4,$5,$6)', [id, kind, title, publisher, language, 'Demo reference — citations must be checked by a reviewer.']);
    }
  });

  // Knowledge documents, versions, chunks (+ embeddings), claims, relationships.
  for (const e of KNOWLEDGE) {
    const chunks = chunksFor(e);
    const vectors = await s.embeddings.embed(chunks.map((c) => c.content), 'document');
    await s.db.tx(async (q) => {
      await q.query('insert into knowledge_documents (id, topics, confidence, review_status, is_demo, current_version, demo_version) values ($1,$2,$3,$4,true,1,1)', [e.id, e.topics, e.confidence, 'draft']);
      const { evidence, ...content } = e;
      const provenance = {
        origin: 'seed-demo',
        importedFrom: 'src/content/knowledge.ts',
        sources: evidence.map((ev) => ({ ref: ev.ref, kind: ev.kind, sourceId: sourceIdFor(ev.ref, ev.kind), rendering: ev.rendering, translationName: ev.translationName ?? null })),
        note: 'Demo content prepared for review. Not reviewed by a scholar board.',
      };
      await q.query('insert into knowledge_document_versions (document_id, version, content, evidence, change_note, provenance) values ($1, 1, $2, $3, $4, $5)', [
        e.id,
        JSON.stringify(content),
        JSON.stringify(evidence),
        'Initial demo import',
        JSON.stringify(provenance),
      ]);
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        await q.query(
          `insert into knowledge_chunks (document_id, version, source_id, language, section, reference, content, keywords, embedding, embedding_model, review_status)
           values ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')`,
          [e.id, c.sourceId, c.language, c.section, c.reference, c.content, e.keywords, toPgVector(vectors[i]), s.embeddings.id],
        );
      }
      for (const ev of e.evidence) {
        await q.query('insert into knowledge_claims (document_id, version, statement, source_id, source_location, rendering, review_status) values ($1, 1, $2, $3, $4, $5, $6)', [
          e.id,
          JSON.stringify(ev.text),
          sourceIdFor(ev.ref, ev.kind),
          ev.ref,
          ev.rendering,
          'draft',
        ]);
        await q.query("insert into knowledge_relationships (from_type, from_id, relation, to_type, to_id) values ('source', $1, 'supports', 'document', $2) on conflict do nothing", [sourceIdFor(ev.ref, ev.kind), e.id]);
      }
      for (const t of e.topics) await q.query("insert into knowledge_relationships (from_type, from_id, relation, to_type, to_id) values ('document', $1, 'explains', 'topic', $2) on conflict do nothing", [e.id, t]);
    });
  }

  // Missions as data definitions (the engine renders them by interaction type).
  await s.db.tx(async (q) => {
    for (const m of MISSIONS) {
      const def = buildMissionDefinition(m, { WUDU_STEPS, SALAH_STEPS, MATCH_SETS, CHOICE_STORIES, CLUE_HUNTS, REFLECTION_PROMPTS });
      await q.query(
        `insert into missions (id, number, location, chapter, topic, concept, interaction_type, modality, difficulty, minutes, definition, is_demo, demo_version)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,1)`,
        [m.id, m.number, m.location, LOCATION_BY_ID[m.location].chapter, m.topic, m.concept, m.mechanic, m.modality, m.difficulty, m.minutes, JSON.stringify(def)],
      );
      await q.query("insert into mission_versions (mission_id, version, definition, provenance) values ($1, 1, $2, '{\"origin\":\"seed-demo\"}') on conflict do nothing", [m.id, JSON.stringify(def)]);
      for (const k of m.knowledge) await q.query("insert into knowledge_relationships (from_type, from_id, relation, to_type, to_id) values ('mission', $1, 'illustrates', 'document', $2) on conflict do nothing", [m.id, k]);
      await q.query("insert into knowledge_relationships (from_type, from_id, relation, to_type, to_id) values ('mission', $1, 'explains', 'concept', $2) on conflict do nothing", [m.id, m.concept]);
    }
    const ordered = [...MISSIONS].sort((a, b) => a.number - b.number);
    for (let i = 1; i < ordered.length; i++) {
      await q.query("insert into knowledge_relationships (from_type, from_id, relation, to_type, to_id) values ('mission', $1, 'precedes', 'mission', $2) on conflict do nothing", [ordered[i - 1].id, ordered[i].id]);
    }
  });

  // Daily Deen: curated items only (never generated), rotated by date.
  await s.db.tx(async (q) => {
    for (const e of KNOWLEDGE) {
      await q.query('insert into daily_content (id, kind, document_id, topic, is_demo) values ($1, $2, $3, $4, true)', [
        `daily-${e.id}`,
        e.id === 'k-sleep-dua' || e.id === 'k-knowledge-dua' ? 'dua' : e.topics.includes('character') ? 'reflection' : 'learning',
        e.id,
        e.topics[0],
      ]);
    }
  });

  // Sample personas for demo circles. Clearly flagged is_demo; they cannot sign in.
  const userIds = new Map<string, string>();
  await s.db.tx(async (q) => {
    for (const m of Object.values(MEMBERS)) {
      const u = await one<{ id: string }>(q, 'insert into users (is_guest, is_demo, demo_handle) values (false, true, $1) returning id', [m.id]);
      userIds.set(m.id, u!.id);
      const band = m.role === 'mentor' ? 'adult' : ['khalid', 'layan'].includes(m.id) ? 'teen' : ['sam', 'aisha', 'noor'].includes(m.id) ? 'adult' : 'child';
      await q.query("insert into profiles (user_id, display_name, purpose, character, onboarding_completed_at) values ($1,$2,'learn-more',$3, now())", [u!.id, m.name, JSON.stringify(m.look)]);
      await q.query('insert into age_status (user_id, declared_band, guardian_consent) values ($1,$2,$3)', [u!.id, band, band === 'child' ? 'granted' : 'not_required']);
      await q.query("insert into user_roles (user_id, role) values ($1, 'learner')", [u!.id]);
      if (m.role === 'mentor') await q.query("insert into user_roles (user_id, role) values ($1, 'mentor')", [u!.id]);
    }
    for (const c of CIRCLES) {
      await q.query(
        `insert into circles (id, name, tagline, age_band, languages, path, moderated, rules, weekly_goal, challenge, resources, is_demo)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true)`,
        [
          c.id,
          JSON.stringify(c.name),
          JSON.stringify(c.tagline),
          c.ageBand,
          c.languages,
          JSON.stringify(c.path),
          c.moderated,
          JSON.stringify({ en: 'Be kind. Keep personal details private. Religious rulings go to Ask a Scholar.', ar: 'كن لطيفًا. لا تشارك بياناتك الشخصية. الأحكام الشرعية تُسأل في «اسأل عالمًا».' }),
          JSON.stringify(c.weeklyGoal),
          JSON.stringify({ ...c.challenge, pinned: c.pinned }),
          JSON.stringify(c.resources),
        ],
      );
      for (const mid of c.memberIds) {
        await q.query('insert into circle_members (circle_id, user_id, role) values ($1,$2,$3)', [c.id, userIds.get(mid), MEMBERS[mid].role === 'mentor' ? 'mentor' : 'member']);
      }
    }
    const idMap = new Map<string, string>();
    for (const m of seedMessages(Date.now()).sort((a, b) => a.at - b.at)) {
      const row = await one<{ id: string }>(q, 'insert into chat_messages (circle_id, author_id, body, reply_to, pinned, created_at) values ($1,$2,$3,$4,$5,$6) returning id', [
        m.circleId,
        userIds.get(m.authorId),
        m.text,
        m.replyTo ? idMap.get(m.replyTo) ?? null : null,
        !!m.pinned,
        new Date(m.at).toISOString(),
      ]);
      idMap.set(m.id, row!.id);
      for (const [reaction, who] of Object.entries(m.reactions)) {
        for (const w of who) await q.query('insert into chat_reactions (message_id, user_id, reaction) values ($1,$2,$3) on conflict do nothing', [row!.id, userIds.get(w), reaction]);
      }
    }
  });

  // Sample scholar profiles: SAMPLE demo personas — a state that can never become verified.
  await s.db.tx(async (q) => {
    const ibrahim = await one<{ id: string }>(
      q,
      `insert into scholar_profiles (display_name, title, specialization, languages, verification_status, is_demo)
       values ('Dr. Ibrahim Al-Sayed (sample)', $1, $2, $3, 'sample', true) returning id`,
      [JSON.stringify({ en: 'Scholar of Fiqh', ar: 'باحث في الفقه' }), JSON.stringify({ en: 'Worship · comparative fiqh', ar: 'العبادات · الفقه المقارن' }), ['Arabic', 'English']],
    );
    const khadija = await one<{ id: string }>(
      q,
      `insert into scholar_profiles (display_name, title, specialization, languages, verification_status, is_demo)
       values ('Ustadha Khadija Rahman (sample)', $1, $2, $3, 'sample', true) returning id`,
      [JSON.stringify({ en: 'Qur’an & Tafsir teacher', ar: 'معلمة قرآن وتفسير' }), JSON.stringify({ en: 'Tafsir · teaching new Muslims', ar: 'التفسير · تعليم المسلمين الجدد' }), ['English', 'Arabic']],
    );
    const asker = userIds.get('sam')!;
    const q1 = await one<{ id: string }>(q, "insert into scholar_questions (asker_id, question, topic, status) values ($1, 'Can I pray while I’m still learning the Arabic words?', 'prayer', 'answered') returning id", [asker]);
    await q.query('insert into scholar_answers (question_id, scholar_id, body, sources, is_demo) values ($1,$2,$3,$4,true)', [
      q1!.id,
      khadija!.id,
      JSON.stringify({
        en: 'Yes — begin praying now. Learn al-Fatihah step by step; until you have memorised it, scholars teach that you say what you are able to (such as “SubhanAllah, Alhamdulillah, La ilaha illa Allah, Allahu Akbar”). Keep learning a little each day.',
        ar: 'نعم، ابدأ الصلاة الآن. تعلّم الفاتحة خطوة بخطوة، وحتى تحفظها يعلّم العلماء أن تقول ما تستطيع (مثل: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر). واصل التعلم قليلًا كل يوم.',
      }),
      JSON.stringify(["Qur'an 2:286", 'Sunan Abi Dawud 832']),
    ]);
    const q2 = await one<{ id: string }>(q, "insert into scholar_questions (asker_id, question, topic, status) values ($1, 'I missed Fajr because I overslept. What should I do?', 'prayer', 'answered') returning id", [asker]);
    await q.query('insert into scholar_answers (question_id, scholar_id, body, sources, is_demo) values ($1,$2,$3,$4,true)', [
      q2!.id,
      ibrahim!.id,
      JSON.stringify({
        en: 'Pray it as soon as you wake up or remember — that is its time for you. Oversleeping without negligence is not a sin; take reasonable steps like an alarm, and don’t let guilt keep you from the next prayer.',
        ar: 'صلّها حين تستيقظ أو تتذكر، فذلك وقتها في حقك. النوم دون تفريط ليس إثمًا؛ خذ بالأسباب كالمنبّه، ولا تدع الشعور بالذنب يمنعك من الصلاة التالية.',
      }),
      JSON.stringify(['Sahih Muslim 684']),
    ]);
  });
}
