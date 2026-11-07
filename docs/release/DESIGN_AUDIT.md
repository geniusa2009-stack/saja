# SAJA — Design & UX Audit

**Evidence class:** screen-level observations reported by the prior implementation session, not direct image inspection in this session.

## Previously detected and addressed

- Quran sidebar overflow at desktop 1280×800: reportedly repaired by consolidating Qur'an and Hadith under Learn.
- English-only Quran heading in Arabic layout: reportedly corrected.
- Click-only Learn card: reportedly converted to focusable semantic links.
- Visual duplicate counter in Arabic quest HUD: reportedly removed while retaining screen-reader announcements.
- 3D no-WebGL blank state: reportedly replaced with a usable 2D fallback.
- Google Fonts remote fetching: reportedly replaced with local copies for privacy and CSP stability.

## Review matrix

Prior automated checks: 27 screens, three viewport widths and two languages, no clipping/overflow reported. Accessibility: no **serious/critical** axe findings reported; this is not proof of all WCAG requirements.

| Surface | Human review needs |
|---|---|
| Welcome/onboarding | Legible on 375px, low-pressure language, clear age/consent choices |
| Village/character | Camera visibility, NPC labels, interaction discoverability, reduced-motion |
| Learn/Quran/Hadith | Arabic typography, bilingual coherence, review labels, source links |
| Quest and dialogue | Focus handling, keyboard/touch, last clue, completion clarity |
| Account/guardian/community | Privacy defaults, report/block, recoverable errors |
| Staff | Role disclosure, publishing safeguards, audit-trail visibility |

## Acceptance criteria

- Run human inspection with screenshots at 375, 768 and 1280 px in English/Arabic.
- Check VoiceOver on macOS/iOS and TalkBack on Android on real hardware.
- Check keyboard tab order, focus trapping, screen-reader labels, visible focus, color contrast, text zoom to 200%, reduced-motion.
- Confirm no fake content, inaccessible game-only interactions or misleading approval badges.

**Status:** Visually promising per agent report; manual and assistive-technology review still open.
