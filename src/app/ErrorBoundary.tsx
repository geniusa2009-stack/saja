import { Component, type ReactNode } from 'react';
import { ErrorState } from '@/design-system';
import { translate } from '@/i18n';
import { useSettings } from '@/store/settings';

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  componentDidCatch(error: Error) {
    console.error('[SAJA]', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const l = useSettings.getState().locale;
    return (
      <div className="page">
        <ErrorState title={translate(l, 'err.boundaryTitle')} body={translate(l, 'err.boundaryBody')} onRetry={() => this.setState({ error: null })} />
      </div>
    );
  }
}
