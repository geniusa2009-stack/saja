/**
 * Mission editing is TEXT-ONLY. Staff can change the words (every English/Arabic
 * pair inside a definition) but never the structure: ids, order, answers, the
 * interaction type, rewards and unlocks stay exactly as the engine expects.
 * That keeps every mission playable after an edit without a mission CMS.
 */
import { AppError } from '../../lib/errors.ts';

export interface MissionText {
  path: string;
  en: string;
  ar: string;
}

const isText = (v: unknown): v is { en: string; ar: string } =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 2 && typeof (v as { en: unknown }).en === 'string' && typeof (v as { ar: unknown }).ar === 'string';

/** Every EN/AR pair in a definition, addressed by a dotted path (e.g. `payload.steps.3.hint`). */
export function listTexts(def: unknown): MissionText[] {
  const out: MissionText[] = [];
  const walk = (v: unknown, path: string[]) => {
    if (isText(v)) out.push({ path: path.join('.'), en: v.en, ar: v.ar });
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, String(i)]));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, [...path, k]);
  };
  walk(def, []);
  return out;
}

/** Applies text edits to a copy. Any path that isn't an existing EN/AR pair is refused. */
export function applyTexts<T>(def: T, edits: MissionText[]): { definition: T; changed: number } {
  const copy = structuredClone(def) as unknown;
  let changed = 0;
  for (const e of edits) {
    const parts = e.path.split('.');
    if (!parts.length || parts.some((p) => !p || p === '__proto__' || p === 'constructor' || p === 'prototype')) throw new AppError('bad_request', `Not an editable text: ${e.path}`);
    let node: unknown = copy;
    for (const p of parts) node = node && typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, p) ? (node as Record<string, unknown>)[p] : undefined;
    if (!isText(node)) throw new AppError('bad_request', `Not an editable text: ${e.path}`);
    const en = e.en.trim();
    const ar = e.ar.trim();
    if (!en || !ar) throw new AppError('bad_request', `Both languages are required: ${e.path}`);
    if (node.en !== en || node.ar !== ar) {
      node.en = en;
      node.ar = ar;
      changed++;
    }
  }
  return { definition: copy as T, changed };
}
