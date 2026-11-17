import { useI18n } from '@/i18n';
import type { ContentStatus } from './experienceModel';

/** A catalogue pointer is not religious verification. Each label states its actual provenance. */
const LABELS: Record<ContentStatus, { ar: string; en: string }> = {
  demo: { ar: 'تجريبي · لم تكتمل المراجعة', en: 'Demo · review incomplete' },
  fiction: { ar: 'حكاية خيالية · ليست مصدرًا دينيًا', en: 'Fictional story · not a religious source' },
  navigation: { ar: 'رابط لقسم · راجع مصادره داخله', en: 'Section link · check sources inside' },
  reviewed: { ar: 'مراجع في النسخة المحلية · تحقق من المنشور', en: 'Reviewed in bundled copy · check published version' },
};

export function ContentTrustMark({ status }: { status: ContentStatus }) {
  const { l } = useI18n();
  return <span className="exph-trust" data-status={status}>{l(LABELS[status])}</span>;
}
