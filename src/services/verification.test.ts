import { extractAndVerify, isClaim, runVerification, TranscriptionUnavailableError } from './verification';

const SCRIPT =
  'Ramadan is a special month. Fasting in Ramadan is one of the five pillars of Islam, and the Qur’an was first revealed in this month. Every child must fast from the age of seven, and Laylat al-Qadr is the 27th night. The Prophet ﷺ said that whoever fasts the first day will never feel hungry again.';

describe('AMANAH / NOUR verification', () => {
  it('reproduces the brand-board audit of the Ramadan script', () => {
    const r = extractAndVerify(SCRIPT);
    const verdicts = r.claims.map((c) => c.verdict);
    expect(verdicts).toEqual(['supported', 'supported', 'mismatch', 'needs-context', 'review']);
    expect(r.counts).toEqual({ supported: 2, 'needs-context': 1, mismatch: 1, unverified: 0, review: 1 });
  });

  it('treats opinions as non-claims', () => {
    expect(isClaim('Ramadan is a special month.')).toBe(false);
    expect(isClaim('رمضان شهر مميز.')).toBe(false);
    expect(isClaim('Fasting is obligatory at puberty.')).toBe(true);
  });

  it('never invents a verdict: unknown claims and hadith attributions need a human', () => {
    const r = extractAndVerify('The Prophet ﷺ said sharing this message brings good news in three days.');
    expect(r.claims[0].verdict).toBe('review');
    expect(r.claims[0].evidence).toHaveLength(0);
  });

  it('offers a revision for mismatches and a hedged phrasing passes', () => {
    const r = extractAndVerify('Every child must fast from the age of seven.');
    expect(r.claims[0].suggestion?.en).toMatch(/puberty/);
    expect(extractAndVerify('Many scholars say Laylat al-Qadr is the 27th night, but it may be another odd night.').claims[0].verdict).not.toBe('needs-context');
  });

  it('works in Arabic', () => {
    const r = extractAndVerify('يجب على كل طفل الصيام من سن السابعة. نزل القرآن في شهر رمضان.');
    expect(r.claims.map((c) => c.verdict)).toEqual(['mismatch', 'supported']);
  });

  it('is honest about media it cannot transcribe', async () => {
    await expect(runVerification({ kind: 'audio', file: { name: 'a.mp3', type: 'audio/mpeg', size: 10 } }, () => {})).rejects.toBeInstanceOf(TranscriptionUnavailableError);
  });
});
