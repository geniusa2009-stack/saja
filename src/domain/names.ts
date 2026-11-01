/**
 * Display names can't claim a role or a verification someone doesn't have.
 * Badges come only from server state; this stops a name doing the same job
 * ("Verified Scholar", "SAJA Moderator"). Checked on the device for a friendly
 * message and again by the server, which decides.
 */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ٰـ]/g, '') // Arabic diacritics + tatweel
    .replace(/[̀-ͯ]/g, '')
    .replace(/[أإآٱ]/g, 'ا');

const RESERVED = [
  /\b(verified|moderator|mod team|admin|administrator|official|staff|scholar|mufti)\b/,
  /\bsaja\s*(team|staff|support|admin|official)\b/,
  /موثق|مشرف|المشرف|مسؤول|ادارة|فريق سجى|سجى الرسمي|مفتي|رسمي/,
];

export const isReservedName = (name: string) => RESERVED.some((re) => re.test(norm(name)));
