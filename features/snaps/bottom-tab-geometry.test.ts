import { describe, expect, it } from 'vitest';

import { getBottomTabGeometry } from '@/features/snaps/bottom-tab-geometry';

describe('bottom tab geometry', () => {
  it.each([
    [0, 56, 66],
    [34, 90, 100],
  ])('uses the bottom inset for occupied height and overlay clearance', (bottomInset, occupiedHeight, overlayClearance) => {
    expect(getBottomTabGeometry(bottomInset)).toMatchObject({ occupiedHeight, overlayClearance });
  });
});
