import type { LocalImageAvailability } from '@/features/images/local';
import type { Snap } from '@/features/snaps/types';

export type LocalMediaHealthSummary = {
  totalSnaps: number;
  withLocalPath: number;
  available: number;
  missing: number;
  unavailable: number;
  withoutLocalMedia: number;
};

export function summarizeLocalMediaHealth(snaps: Pick<Snap, 'localPath'>[], availabilityByLocalPath: Map<string, LocalImageAvailability>): LocalMediaHealthSummary {
  return snaps.reduce<LocalMediaHealthSummary>(
    (summary, snap) => {
      summary.totalSnaps += 1;

      if (!snap.localPath) {
        summary.withoutLocalMedia += 1;
        return summary;
      }

      summary.withLocalPath += 1;

      const availability = availabilityByLocalPath.get(snap.localPath) ?? 'missing';
      if (availability === 'available') {
        summary.available += 1;
      } else if (availability === 'unavailable') {
        summary.unavailable += 1;
      } else {
        summary.missing += 1;
      }

      return summary;
    },
    {
      totalSnaps: 0,
      withLocalPath: 0,
      available: 0,
      missing: 0,
      unavailable: 0,
      withoutLocalMedia: 0,
    },
  );
}
