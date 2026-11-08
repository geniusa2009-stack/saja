# Hadith library: content, review and publication

The Hadith library is a small, curated reading collection inside SAJA. This
document describes the editorial rules, how an exact hadith snapshot moves
through the existing content-review ledger, and what a learner is allowed to
see.

The short version:

- **The Arabic matn, reference, grading and SAJA meaning are one reviewable
  snapshot.** They are never reviewed “in general” or separately.
- **Every bundled record is DRAFT / DEMO.** It says so in the library, on the
  detail screen, in Activities and in the Staff console.
- **Only a published snapshot from the server may lose the demo label.** A
  malformed, partial or unreachable overlay falls back to the labelled bundled
  demo record.
- **The English is a SAJA meaning paraphrase, not a translation.** The
  `englishMeaning.kind` field is always `saja-paraphrase`.
- **No hadith text is generated at runtime.** No AI model writes, completes or
  “corrects” Arabic, references, chains or gradings.

## The curated set (11 records)

| Library id | Reference | Theme |
| --- | --- | --- |
| `h-bukhari-1` | Sahih al-Bukhari 1 | Actions and intentions |
| `h-bukhari-10` | Sahih al-Bukhari 10 | The tongue and the hand |
| `h-bukhari-13` | Sahih al-Bukhari 13 | Wanting good for others |
| `h-bukhari-69` | Sahih al-Bukhari 69 | Ease, not hardship |
| `h-bukhari-6018` | Sahih al-Bukhari 6018 | Neighbour, guest and speech |
| `h-bukhari-6114` | Sahih al-Bukhari 6114 | Strength is self-control |
| `h-bukhari-6464` | Sahih al-Bukhari 6464 | Small, steady deeds |
| `h-bukhari-7376` | Sahih al-Bukhari 7376 | Mercy for people |
| `h-bukhari-5027` | Sahih al-Bukhari 5027 | Seeking knowledge |
| `h-muslim-2699a` | Sahih Muslim 2699a | Ease after distress |
| `h-tirmidhi-1956` | Jami‘ at-Tirmidhi 1956 | A smile is charity |

Each record in `src/content/hadith.ts` carries:

- the Arabic matn exactly as published at Sunnah.com, with a direct deep link
  shaped `https://sunnah.com/<collection>:<number>`;
- the collection, book reference, in-book reference and Arabic edition;
- the grading label and its authority, exactly as published at the source;
- a bilingual SAJA meaning explanation, explanation, context and “why it
  matters”;
- vocabulary, topics, age bands, related knowledge and related hadith;
- `reviewStatus: 'demo-unreviewed'` in the bundled record.

### Source and integrity rules

The following are enforced by `hadithIntegrityIssues()` in
`src/domain/hadith.ts` and checked by `src/domain/__tests__/hadith.test.ts`:

- a non-empty Arabic matn;
- a source URL that starts with `https://sunnah.com/` and ends with the exact
  collection and number;
- a reference, grading authority and grading note in both languages;
- English marked as `saja-paraphrase`;
- a non-empty age suitability and at least one topic;
- unique, stable `h-…` ids;
- valid related-hadith links and valid related knowledge ids;
- every bundled record starts `demo-unreviewed`;
- the reviewed snapshot contains **no** review status field.

The matn is shown without its isnad in the reading view. That is a display
choice, stated on the detail screen; the Arabic itself is not shortened,
modernised or paraphrased.

### Tirmidhi 1956

Sunnah.com publishes the grade **“Hasan (Darussalam)”** for this record.
Darussalam is a publisher, so its grade is a publisher's classification, not a
quotation from Imam at-Tirmidhi. The record also carries the Imam's own Arabic
description, *hasan gharib*, and the UI says both things plainly. Do not
silently turn one into the other.

### Activities are not hadith

The six discovery activities in `src/content/hadithActivities.ts` are original
SAJA learning material: scenarios, a matching exercise, an original story, a
source-type sort, a private reflection and review cards. They are labelled
**“Original SAJA activity · not a hadith”** in the interface. They are not
quotations, tafsir or fatwa, and they never carry a scholar-approved badge.
Where an activity discusses a hadith, it links to the actual library record so
the Arabic, reference, grading and review label are one tap away.

## How review works

Hadith records use the same five-state ledger as knowledge, missions and the
texts that live in code:

```
DRAFT → INTERNAL REVIEW → SCHOLAR REVIEW → APPROVED → PUBLISHED
                                                        │
                                             (a later edit returns to DRAFT)
```

The server enforces the transitions, not the client:

- staff roles may move an item to internal or scholar review;
- **a verified, non-sample scholar** may approve, and may never approve a
  version they authored;
- **only an admin may publish**, and only from `approved`;
- every step records a written scope, the reviewer, their role, the exact
  version, the time and — for approval — the scholar profile.

When a hadith is registered, the snapshot stored in `content_blocks.content` is:

```json
{ "record": { "id": "h-bukhari-1", "arabic": "…", "source": { … }, "grading": { … }, "englishMeaning": { "kind": "saja-paraphrase", "note": { … } }, … } }
```

`hadithSnapshot()` strips `reviewStatus` before the object is stored. The
review applies to exactly that object. There is no separate approval of a
“theme” or a translation memory.

### What gets reviewed

A reviewer must check, at minimum:

1. the Arabic matn against the linked Sunnah.com page;
2. the collection, number, in-book reference and Arabic edition;
3. the grading label, authority and note;
4. the SAJA English meaning against the Arabic, in both languages;
5. the explanation, context and “why it matters” for accuracy and tone;
6. vocabulary and related links;
7. age suitability and topic labels;
8. that the English is presented as a meaning explanation, never as a
   published translation.

The scope field should say what was actually checked, for example:
“Arabic matn, reference, grading, both-language meaning and explanation against
Sunnah.com”.

## Staff workflow

In **Staff console → Content status**, the **Hadith library** card shows total,
by-status and learner-serving counts. In **Rules & texts**, choose the
**Hadith** tab:

1. open a record and read the Arabic, reference, grading and meaning preview;
2. use **Review** to inspect the trail;
3. a moderator moves it to **Internal review**, then **Scholar review**;
4. a verified scholar who did not author the exact snapshot approves it, or
   returns it to draft with a note;
5. an admin publishes the approved version.

A code change to the snapshot is a new version. If a published hadith's text,
reference, grading or meaning changes, `syncContentBlocks()` resets it to
**Draft** and clears `published_version`; the old approval is never carried
forward. Restoring the old text creates another new draft — it does not
resurrect the old publication. `server/test/hadith.test.ts` proves this.

To withdraw a published record, an admin archives it. It disappears from the
learner endpoint; its history remains in the ledger.

## What learners receive

The public endpoint is `GET /api/hadith`:

```json
{
  "items": [
    {
      "id": "h-bukhari-1",
      "version": 3,
      "content": { "id": "h-bukhari-1", "arabic": "…", "source": { … }, "grading": { … }, "englishMeaning": { … }, … },
      "reviews": [ … ]
    }
  ],
  "demo": ["h-bukhari-10", "h-bukhari-13", "…"]
}
```

- `items` contains **only published** `hadith` blocks. The content is the bare
  snapshot, not the `{ record }` wrapper used by the staff ledger.
- `demo` lists bundled ids with no published snapshot, so the client can label
  them honestly.
- The client (`src/api/hadith.ts`) validates each overlay with
  `hadithFromSnapshot()`. An overlay that is missing fields, has the wrong id,
  uses another source URL, or claims a non-SAJA English kind is ignored and the
  bundled demo record remains.
- Offline, or if the endpoint is unavailable, the library serves the bundled
  records with a clear **Offline demo** note.

The UI never shows “Scholar-approved” merely because the request succeeded. It
shows it only for an exact snapshot that passed validation and came from the
published set. The detail screen shows the version, the approval scope and the
scholar name when the server supplies them.

## Tests

- `src/domain/__tests__/hadith.test.ts` — search/folding, filters, integrity,
  snapshot validation, activity links and the future world-station resolver.
- `src/api/hadith.test.ts` — bundled demo status, published overlay, malformed
  overlay rejection, no invented records, session cache and offline fallback.
- `src/features/hadith/Hadith.test.tsx` — library, Arabic/RTL, detail
  provenance, save separation, activity completion and private reflection.
- `server/test/hadith.test.ts` — draft registration, public endpoint hides
  unpublished records, the role-gated publish path, review trail, code change
  resetting publication, and restoring a snapshot as a new draft.
- `server/test/review.test.ts` — the shared block review workflow including the
  new `hadith` kind.

Run the relevant checks with:

```sh
npx vitest run src/domain/__tests__/hadith.test.ts src/api/hadith.test.ts src/features/hadith/Hadith.test.tsx
npx vitest run server/test/hadith.test.ts server/test/review.test.ts
npm run check
```

## Adding or changing a record

1. Confirm the Arabic and grading on the direct Sunnah.com page.
2. Add the record to `src/content/hadith.ts` with a stable `h-` id and all
   required fields; keep `reviewStatus: 'demo-unreviewed'`.
3. Keep the English a SAJA paraphrase. Do not paste a published translation.
4. Add vocabulary, topics, age bands and related links that are actually
   supported by the record.
5. Run the domain tests and the server tests. The migration
   `006_hadith_content_blocks.sql` already allows the `hadith` kind.
6. Restart/seed so `syncContentBlocks()` registers the new draft. It starts in
   **Draft** and learners see the bundled demo record until the full review and
   publication path is complete.
7. If the record is used by a discovery activity or a world station, update the
   link in `src/content/hadithActivities.ts` or
   `src/features/hadith/integration.ts`.

## Related documents

- `docs/CONTENT_REVIEW.md` — the shared review workflow for all content.
- `docs/HADITH_3D_INTEGRATION.md` — the future world-station contract.
- `docs/SAFETY_AND_SECURITY.md` — the wider content and AI safety rules.
