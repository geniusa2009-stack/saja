/**
 * i18n: typed dictionaries, direction handling and locale-aware formatting.
 * Layout never assumes LTR — components use CSS logical properties and read
 * `dir` from here when geometry must flip (e.g. the world path).
 */
import { useEffect } from 'react';
import type { L10n, Locale } from '@/domain/types';
import { useSettings } from '@/store/settings';
import { en, type Dict } from './en';
import { ar } from './ar';

const DICTS: Record<Locale, Dict> = { en, ar };

export type TKey = keyof Dict;

export function translate(locale: Locale, key: TKey, vars?: Record<string, string | number>): string {
  const s = DICTS[locale][key] ?? DICTS.en[key] ?? key;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? `{${k}}` : formatVar(locale, vars[k])));
}

function formatVar(locale: Locale, v: string | number) {
  return typeof v === 'number' ? new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en').format(v) : v;
}

export function useI18n() {
  const locale = useSettings((s) => s.locale);
  const dir: 'rtl' | 'ltr' = locale === 'ar' ? 'rtl' : 'ltr';
  return {
    locale,
    dir,
    isRTL: dir === 'rtl',
    t: (key: TKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    /** Pick the right language from content. */
    l: (v: L10n | undefined) => (v ? v[locale] || v.en : ''),
    num: (n: number) => formatVar(locale, n),
    intl: locale === 'ar' ? 'ar-EG' : 'en-GB',
  };
}

/** Keeps <html lang/dir> in sync so CSS :lang() and logical properties just work. */
export function useDocumentLocale() {
  const locale = useSettings((s) => s.locale);
  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.title = locale === 'ar' ? 'سَجَى — رحلة إسلامية تفاعلية' : 'SAJA — The Islamic Interactive Journey';
  }, [locale]);
}
