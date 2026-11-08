import { describe, expect, it } from 'vitest';
import { findInQuran, makeMemorizationOptions, normalizeArabic, validDuaPack, validHadithPack, validSearchPack } from './quality';

describe('SAJA Quran/Hadith Premium Library data safeguards', () => {
  it('normalizes search text without mutating the original ayah string', () => {
    const original = 'ٱلرَّحْمَٰنِ';
    expect(normalizeArabic(original)).toBe('الرحمن');
    expect(original).toBe('ٱلرَّحْمَٰنِ');
  });
  it('returns only matching source text in global search', () => {
    const items = [
      { surah: 1, ayah: 1, text: 'بِسْمِ ٱللَّهِ' },
      { surah: 1, ayah: 2, text: 'ٱلْحَمْدُ لِلَّهِ' },
    ];
    expect(findInQuran(items, 'الحمد')).toEqual([items[1]]);
    expect(findInQuran(items, 'ا')).toEqual([]);
  });
  it('memorization options use unmodified source verses', () => {
    const verses = [
      {id:1,text:'آية أ'}, {id:2,text:'آية ب'}, {id:3,text:'آية ج'}, {id:4,text:'آية د'},
    ];
    const quiz = makeMemorizationOptions(verses,1);
    expect(quiz?.answer).toBe(2);
    expect(quiz?.choices).toHaveLength(3);
    expect(quiz?.choices.some(c => c.id === 2 && c.text === 'آية ب')).toBe(true);
    expect(makeMemorizationOptions(verses,4)).toBeNull();
  });
  it('rejects invalid or duplicate Quran search entries', () => {
    const fake = {source:'Tanzil Quran Text',chapters:114,verses:6236,items:[]};
    expect(validSearchPack(fake)).toBe(false);
  });
  it('rejects duplicate hadith IDs and uncredited collections', () => {
    const sample = {id:'1',title:'Test',hadeeth:'هذا متن حديث للاختبار فقط وليس نصا دينيا ولا يُعرض للمستخدم',attribution:'',grade:'صحيح',reference:'',explanation:'',category:'Test'};
    expect(validHadithPack({source:'https://hadeethenc.com/',fetched_at:'2026',items:[sample,sample,...Array.from({length:1000},(_,i)=>({...sample,id:String(i+2)}))]})).toBe(false);
    expect(validHadithPack({source:'https://untrusted.example/',fetched_at:'2026',items:Array.from({length:1001},(_,i)=>({...sample,id:String(i+1)}))})).toBe(false);
  });
  it('rejects impossible dua references', () => {
    expect(validDuaPack({source:'Tanzil',items:Array.from({length:42},(_,i)=>({surah:115,ayah:i+1,arabic:'هذا مثال',source:'Tanzil'}))})).toBe(false);
  });
});
