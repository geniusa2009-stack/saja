/**
 * Ask a Scholar. Questions go to a queue answered by verified human scholars.
 * The AI's only role is to help *organise* the question — it never answers
 * on a scholar's behalf and never impersonates one.
 *
 * Offline build: submissions are stored on-device with status "pending".
 * The backend contract (POST /scholar/questions) is documented in docs/ARCHITECTURE.md.
 */
import type { L10n, TopicId } from '@/domain/types';

export interface ScholarProfile {
  id: string;
  name: string;
  title: L10n;
  specialization: L10n;
  languages: string[];
  /** Sample profiles are clearly labelled in the UI. */
  sample: boolean;
}

export interface ScholarQuestion {
  id: string;
  question: string;
  context?: string;
  topic: TopicId | 'other';
  createdAt: number;
  status: 'pending' | 'answered';
  answer?: { scholarId: string; text: L10n; sources: string[]; answeredAt: number };
}

export const SCHOLARS: Record<string, ScholarProfile> = {
  'sh-ibrahim': {
    id: 'sh-ibrahim',
    name: 'Dr. Ibrahim Al-Sayed',
    title: { en: 'Scholar of Fiqh', ar: 'باحث في الفقه' },
    specialization: { en: 'Worship (‘ibadat) · comparative fiqh', ar: 'العبادات · الفقه المقارن' },
    languages: ['Arabic', 'English'],
    sample: true,
  },
  'ust-khadija': {
    id: 'ust-khadija',
    name: 'Ustadha Khadija Rahman',
    title: { en: 'Qur’an & Tafsir teacher', ar: 'معلمة قرآن وتفسير' },
    specialization: { en: 'Tafsir · teaching new Muslims', ar: 'التفسير · تعليم المسلمين الجدد' },
    languages: ['English', 'Bengali', 'Arabic'],
    sample: true,
  },
};

const D = 86_400_000;
export function seedAnswered(now = Date.now()): ScholarQuestion[] {
  return [
    {
      id: 'sample-1',
      question: 'Can I pray while I’m still learning the Arabic words?',
      topic: 'prayer',
      createdAt: now - 6 * D,
      status: 'answered',
      answer: {
        scholarId: 'ust-khadija',
        text: {
          en: 'Yes — begin praying now. Learn al-Fatihah step by step; until you have memorised it, scholars teach that you say what you are able to (such as “SubhanAllah, Alhamdulillah, La ilaha illa Allah, Allahu Akbar”). Allah does not burden a soul beyond its capacity. Keep learning a little each day.',
          ar: 'نعم، ابدأ الصلاة الآن. تعلّم الفاتحة خطوة بخطوة، وحتى تحفظها يعلّم العلماء أن تقول ما تستطيع (مثل: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر). لا يكلف الله نفسًا إلا وسعها. واصل التعلم قليلًا كل يوم.',
        },
        sources: ["Qur'an 2:286", 'Sunan Abi Dawud 832'],
        answeredAt: now - 5 * D,
      },
    },
    {
      id: 'sample-2',
      question: 'I missed Fajr because I overslept. What should I do?',
      topic: 'prayer',
      createdAt: now - 3 * D,
      status: 'answered',
      answer: {
        scholarId: 'sh-ibrahim',
        text: {
          en: 'Pray it as soon as you wake up or remember — that is its time for you. Oversleeping without negligence is not a sin; take reasonable steps like an alarm, and don’t let guilt keep you from the next prayer.',
          ar: 'صلّها حين تستيقظ أو تتذكر، فذلك وقتها في حقك. النوم دون تفريط ليس إثمًا؛ خذ بالأسباب كالمنبّه، ولا تدع الشعور بالذنب يمنعك من الصلاة التالية.',
        },
        sources: ['Sahih Muslim 684'],
        answeredAt: now - 2 * D,
      },
    },
  ];
}

export { organizeQuestion, type OrganizedQuestion } from '@/domain/questionOrganizer';
