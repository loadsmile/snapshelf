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

export function getLocalMediaHealthMessage(summary: LocalMediaHealthSummary) {
  if (summary.unavailable > 0) {
    return 'Local file storage is unavailable on this device right now. Snap metadata is still safe in your account.';
  }

  if (summary.missing > 0) {
    return 'Some Snap images are missing from this device. Open a Snap to replace its image, remove the broken reference, or visit its original source.';
  }

  if (summary.totalSnaps > 0 && summary.withLocalPath === 0) {
    return 'Snap metadata synced to this installation, but local images do not transfer between devices or return after reinstalling. Add replacement images from each Snap.';
  }

  if (summary.totalSnaps === 0) {
    return 'There are no Snaps to check yet.';
  }

  return 'Local media looks healthy on this device.';
}
