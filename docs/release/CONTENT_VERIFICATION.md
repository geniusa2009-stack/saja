# SAJA — Content Verification & Licensing Register

**Launch status: BLOCKED.** Automated text comparison never replaces specialist review of religious explanation, legal rights clearance or grade/source accuracy.

## Quran (Al-Fatiha)

Previous local agent reported: seven Arabic ayat matched the Tanzil Uthmani v1.1 reference byte-for-byte after correcting the appropriate tatweel characters. Word segmentation and puzzle assembly tests were added/passed. Review the exact version, its license/attribution, and the current code before relying on this assertion.

**Unresolved:** scholarly review of commentary, roots and grammar, translation rights, application-wide re-use of English word glosses, accuracy of interpretative notes, source passage/edition mapping, audio licensing.

**Distribution gate:** full-verse Saheeh International text was reportedly moved into draft/review-only imports and excluded from production chunks. The same translation appears elsewhere in the knowledge base, so inspect the **entire production output**, not only Quran Odyssey. Avoid unlicensed release even when text is invisible in the UI.

## Hadith

Previous agent reported eleven Arabic matns corroborated against an independent machine-readable dataset (Muslim 2699a maps to 2699.01 there). It could not directly verify the cited Sunnah.com pages because automated requests returned 403. This is **corroboration, not direct source sign-off**.

For each entry the reviewer must record: collection; book; exact number; edition/volume; Arabic wording; meaning; grading and source; license; reviewer and date. Check Tirmidhi 1956 grade closely against the intended authority. Never represent source-specific grading as verified from an inaccessible source.

## Rights and publication matrix

| Content | Technical status reported | Public release decision |
|---|---|---|
| Arabic Quran (Al-Fatiha) | Compared to attributed corpus | Conditional on documented source/license check and content sign-off |
| English complete ayah translation (Saheeh International) | Gated out of production | **Do not distribute without rights clearance** |
| Short word glosses | Some wording remains in public bundle | Audit provenance and rights |
| Tafsir/reflection | Drafts | Scholar/qualified reviewer approval required |
| Arabic Hadith | 11 entries independently corroborated | Edition-level direct verification required |
| Hadith meanings/grading | Draft + corroboration | Qualified reviewer approval required |
| 3D assets / fonts / illustrations | Local assets present | Document individual licenses; OFL fonts separately attributed |

## Required closure artifacts

- Signed/recorded religious content review manifest, keyed by content version/hash.
- Rights license or substitute public-domain/licensed translations with verified provenance.
- Edition-specific Hadith table with reviewer citations and correction history.
- Production-build attestation that restricted strings/files are absent.
- Explicit distinction of draft and approved content in both languages.

No policy bypass: **not** an invitation to invent permissions or remove attribution. Human approval remains mandatory.
