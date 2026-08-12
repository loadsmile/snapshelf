import { describe, expect, it } from 'vitest';

import { getLocalMediaHealthMessage, summarizeLocalMediaHealth } from '@/features/images/health';

describe('local media health helpers', () => {
  it('summarizes local media availability for snaps', () => {
    const summary = summarizeLocalMediaHealth(
      [{ localPath: 'snaps/available.jpg' }, { localPath: 'snaps/missing.jpg' }, { localPath: 'snaps/unavailable.jpg' }, { localPath: null }],
      new Map([
        ['snaps/available.jpg', 'available'],
        ['snaps/missing.jpg', 'missing'],
        ['snaps/unavailable.jpg', 'unavailable'],
      ]),
    );

    expect(summary).toEqual({
      totalSnaps: 4,
      withLocalPath: 3,
      available: 1,
      missing: 1,
      unavailable: 1,
      withoutLocalMedia: 1,
    });
  });

  it('treats unchecked local paths as missing', () => {
    const summary = summarizeLocalMediaHealth([{ localPath: 'snaps/not-checked.jpg' }], new Map());

    expect(summary.missing).toBe(1);
  });

  it('explains why metadata can return without local images after reinstalling', () => {
    const summary = summarizeLocalMediaHealth([{ localPath: null }, { localPath: null }], new Map());

    expect(getLocalMediaHealthMessage(summary)).toContain('metadata synced');
    expect(getLocalMediaHealthMessage(summary)).toContain('after reinstalling');
  });

  it('directs missing-image recovery to each Snap', () => {
    const summary = summarizeLocalMediaHealth([{ localPath: 'snaps/missing.jpg' }], new Map());

    expect(getLocalMediaHealthMessage(summary)).toContain('replace its image');
    expect(getLocalMediaHealthMessage(summary)).toContain('original source');
  });
});
