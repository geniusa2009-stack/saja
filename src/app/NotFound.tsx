import { useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '@/design-system';
import { useI18n } from '@/i18n';
import { Page } from './Page';

export default function NotFound() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <Page title={t('err.routeTitle')}>
      <EmptyState
        icon="compass"
        title={t('err.routeTitle')}
        body={t('err.routeBody')}
        action={
          <Button icon="home" onClick={() => navigate('/')}>
            {t('m.backToWorld')}
          </Button>
        }
      />
    </Page>
  );
}
