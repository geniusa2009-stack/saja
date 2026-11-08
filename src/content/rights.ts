/// <reference types="vite/client" />
/**
 * Redistribution rights for third-party texts.
 *
 * A text whose permission is not documented is shown only in draft/review builds — development,
 * tests, or a build made with VITE_SAJA_DRAFT_CONTENT=true for reviewers. A normal production
 * build (`npm run build`) leaves it out. Update the status here only with the permission on file
 * (see docs/release/CONTENT_VERIFICATION.md).
 */
export type RightsStatus = 'cleared' | 'pending';

export const TEXT_RIGHTS = {
  /** Saheeh International English translation of the Qur'an (Al-Muntada Al-Islami). */
  saheehInternational: 'pending',
} as const satisfies Record<string, RightsStatus>;

const draftBuild = import.meta.env.MODE !== 'production' || import.meta.env.VITE_SAJA_DRAFT_CONTENT === 'true';

/** May this build show a text with the given rights status? */
export const mayShow = (status: RightsStatus) => status === 'cleared' || draftBuild;
