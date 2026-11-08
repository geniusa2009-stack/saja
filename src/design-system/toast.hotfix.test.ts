import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast, useToasts } from './toast';

describe('Toast safety for game scenes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToasts.setState({ items: [] });
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    useToasts.setState({ items: [] });
  });
  it('deduplicates repeated non-action notices', () => {
    toast('a quest update repeated in the same tick');
    toast('a quest update repeated in the same tick');
    toast('a quest update repeated in the same tick');
    expect(useToasts.getState().items).toHaveLength(1);
  });
  it('preserves error notices on a scene change', () => {
    toast('success notice for a previous scene');
    toast('error notice for current scene', { tone: 'error' });
    useToasts.getState().clearNonCritical();
    expect(useToasts.getState().items.map(({ text }) => text)).toEqual(['error notice for current scene']);
  });
  it('expires notices on schedule', () => {
    toast('disappearing notice');
    expect(useToasts.getState().items).toHaveLength(1);
    vi.advanceTimersByTime(3800);
    expect(useToasts.getState().items).toHaveLength(0);
  });
  it('does not deduplicate actionable notices', () => {
    toast('undo operation?', { action: { label: 'Undo', run: () => undefined } });
    toast('undo operation?', { action: { label: 'Undo', run: () => undefined } });
    expect(useToasts.getState().items).toHaveLength(2);
  });
});
