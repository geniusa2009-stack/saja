/**
 * Questions that depend on a person's own situation (rulings, family law,
 * finance, missed worship over years…) always go to a qualified human.
 */
const PERSONAL_RULING = [
  /\b(fatwa|ruling for me|is it (haram|halal|allowed|permissible|sinful) (for me|if i)|what should i do|my (situation|case|husband|wife|parents|divorce))\b/i,
  /\b(divorce|talaq|inheritance|mahr|custody|interest|mortgage|loan|riba|combin(e|ing) prayers?|shorten(ing)? prayers?|missed (fasts?|prayers?) for years|kaffara|expiation|nikah)\b/i,
  /فتوى|هل يجوز لي|حكم .* (لي|في حالتي)|طلاق|ميراث|مهر|حضانة|ربا|قرض|فوائد|جمع الصلاة|قصر الصلاة|كفارة|نكاح/u,
  // "Is X haram/halal…?" asks for a ruling, whatever X is. Siraj teaches; it never rules.
  /\b(is|are|was|were)\b[^?.!]{0,60}\b(haram|halal|forbidden|permissible|sinful|makruh|bid'?ah)\b/i,
  /^هل .{0,40}(حرام|حلال|محرم|مباح|مكروه|بدعة)/u,
];

export function needsScholar(text: string): boolean {
  return PERSONAL_RULING.some((re) => re.test(text));
}
