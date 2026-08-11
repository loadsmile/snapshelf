import { describe, expect, it } from 'vitest';

import { getVisibleSelectAllState, retainBulkFailures, toggleAllVisibleSnaps, toggleSnapSelection } from '@/features/snaps/selection';

describe('Snap bulk selection', () => {
  it('toggles individual ids without mutating the current Set', () => {
    const current = new Set(['a']);
    expect([...toggleSnapSelection(current, 'b')]).toEqual(['a', 'b']);
    expect([...toggleSnapSelection(current, 'a')]).toEqual([]);
    expect([...current]).toEqual(['a']);
  });

  it('selects and clears only visible ids', () => {
    const selected = new Set(['hidden']);
    const all = toggleAllVisibleSnaps(selected, ['a', 'b']);
    expect([...all]).toEqual(['hidden', 'a', 'b']);
    expect([...toggleAllVisibleSnaps(all, ['a', 'b'])]).toEqual(['hidden']);
  });

  it('reports mixed visible selection state', () => {
    expect(getVisibleSelectAllState(new Set(), ['a', 'b'])).toBe(false);
    expect(getVisibleSelectAllState(new Set(['a']), ['a', 'b'])).toBe('mixed');
    expect(getVisibleSelectAllState(new Set(['a', 'b']), ['a', 'b'])).toBe(true);
  });

  it('removes successes while retaining failed and uncertain ids', () => {
    const result = {
      succeededIds: ['a'],
      failures: [
        { snapId: 'b', code: 'not_found' as const, message: 'Not found.' },
        { snapId: 'c', code: 'outcome_unknown' as const, message: 'Unknown.' },
      ],
    };
    expect([...retainBulkFailures(new Set(['a', 'b', 'c']), result)]).toEqual(['b', 'c']);
  });
});
