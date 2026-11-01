/** Data hooks shared by the staff console's tabs. */
import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/design-system';
import { useI18n, type TKey } from '@/i18n';
import { api, ApiError } from '@/api/client';

export function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.get<T>(path));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'error');
    }
  }, [path]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, error, load };
}

export function useAct() {
  const { t } = useI18n();
  return async (fn: () => Promise<unknown>, ok: TKey, after?: () => void) => {
    try {
      await fn();
      toast(t(ok));
      after?.();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t('err.internal'));
    }
  };
}
