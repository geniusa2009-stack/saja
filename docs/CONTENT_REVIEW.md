# Moving SAJA's religious content from demo to published

Status today (counted by **Staff console → Content status**): 19 knowledge entries, 12 missions, 16 claim rules, 4 explainer stories, 4 Siraj quizzes, 11 hadith records, 19 Daily Deen items. **0 published. 0 verified scholars. 2 sample scholar profiles.** Everything learners see is labelled *Demo*.

Nothing becomes published by itself, by a script, or by a developer. Every item goes through the same five states, and the server enforces who may take each step:

| Step | Who | What they check | Server rule |
| --- | --- | --- | --- |
| DRAFT | admin or scholar edits | wording in both languages, sources attached | a version that entered review is never overwritten: an edit becomes a new version |
| → INTERNAL REVIEW | moderator, scholar or admin | language, age-appropriateness, tone, typos, that each source is attached to the right text | staff roles only |
| → SCHOLAR REVIEW | moderator, scholar or admin | ready for a scholar | staff roles only |
| → APPROVED | **a verified scholar** | religious accuracy, references, the rendering (translation vs. meaning), confidence level, known differences | verified, non-sample scholar; **never the author of that version** |
| → PUBLISHED | **an admin** | that a scholar approved *this* version | admins only; only from APPROVED |

Every step needs a written *scope* ("full text and sources, both languages") and is stored with the person, their role, the time, the version and, for approvals, the scholar's profile. The trail appears in the item's **Review** section and in **Staff console → Audit trail**.

## Before you start (one time)

1. **Admin**: an operator runs `npm run saja -- grant-role <email> admin` on the server for the first administrator (the person signs up in the app first).
2. **At least two scholars** (the author of an edit cannot approve it). For each:
   - they sign up in the app;
   - an admin opens **Scholar verification → Add a scholar profile**, enters their email, name, titles (EN/AR), specialisation, languages, and **the credentials the admin actually checked outside SAJA** (e.g. ijazah, issuer, year). The profile starts as *Pending*;
   - after checking the credentials, the admin writes the **verified scope** (e.g. "fiqh of worship") and presses **Verify**. SAJA records who verified, when and for what scope.
   - SAJA does **not** check credentials itself. Verification is an organisational decision that SAJA records.
3. Optional: moderators for the internal-review step (`grant-role <email> moderator`).

## For each item

Work through **Knowledge**, then **Missions**, then **Rules & texts** (claim rules, stories, quizzes, hadith). Daily Deen items follow their knowledge entry automatically. The Hadith tab reviews the Arabic matn, reference, grading and SAJA meaning as one exact snapshot; see `docs/HADITH_CONTENT_REVIEW.md` for the extra editorial rules that apply there.

1. **Open** the item. Read the preview (English and Arabic side by side), the sources and the provenance.
2. If a change is needed: **Edit as draft** (knowledge) or **Texts** (missions: words only; steps, answers and rewards can't change), write a change note, and save. Learners keep seeing the current version.
3. Missions: use **Preview**. It plays the version under review with the real interaction, and nothing is recorded.
4. Moderator/scholar: write a scope → **Internal review**, then → **Scholar review**.
5. A verified scholar who did not write this version: write a scope → **Approved** (or → **Draft** with a note explaining what must change).
6. Admin: write a scope → **Published**.
7. Check as a learner: the item shows **Reviewed** (Learn and evidence say "approved by a verified scholar and published", missions show "Reviewed · vN") and Siraj answers from it without the demo label.

## Afterwards

- **Content status** must show the published counts you expect; `/api/system/status` says `content.reviewed: true` only when **no** demo knowledge or missions remain.
- A later code release that changes a claim rule, story, quiz or hadith snapshot sends that text back to **Draft** automatically (a review applies to the exact wording). Review it again. For hadith, changing the Arabic, reference, grading or meaning resets publication; restoring the old text creates a new draft rather than reviving the old approval.
- To withdraw something: → **Archived** (admin). It disappears from learners and Siraj; its history stays.
- The sample scholar profiles and their two sample answers remain labelled *Sample* forever. Remove them from a production database if you don't want them shown.

## Proof that the workflow works

`sh e2e/staff.sh` runs this checklist in a real browser against a throwaway database: an admin verifies two scholars; one edits a knowledge entry and a mission text; both go through internal and scholar review; **the author is refused approval of their own version**; the other scholar approves; nothing reaches learners until the admin publishes; then the learner sees the new version labelled *Reviewed* and Siraj answers from it. A claim rule goes through the same steps. It publishes nothing in any real deployment.

The Hadith ledger has its own end-to-end server proof in `server/test/hadith.test.ts`: all 11 records start as draft, the public endpoint serves none of them, role-gated review and publication work, the learner receives only the published snapshot and its trail, and a changed or restored snapshot cannot revive the old publication. The shared workflow is covered in `server/test/review.test.ts`.

## Related documents

- `docs/HADITH_CONTENT_REVIEW.md` — the Hadith-specific editorial rules and publication path.
- `docs/HADITH_3D_INTEGRATION.md` — the future world-station contract.
- `docs/SAFETY_AND_SECURITY.md` — wider content and AI safety rules.
