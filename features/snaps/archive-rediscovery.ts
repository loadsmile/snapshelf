import type { LocalImageAvailability } from '@/features/images/local';
import { getSnapTimelineDate } from '@/features/snaps/library';
import { normalizeSourceUrl } from '@/features/snaps/source-url';
import type { Snap } from '@/features/snaps/types';

export const ARCHIVE_REDISCOVERY_MAX_ITEMS = 5;
export const ARCHIVE_REDISCOVERY_MIN_AGE_DAYS = 30;

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export type ArchiveRediscoveryItem = {
  snap: Snap;
  hasLocalImage: boolean;
  normalizedSourceUrl: string | null;
};

export type ArchiveRediscoveryAvailabilityCacheEntry = {
  availability: LocalImageAvailability;
  checkedAt: number;
};

export type ArchiveRediscoveryAvailabilityCache = Map<string, ArchiveRediscoveryAvailabilityCacheEntry>;

type LoadDailyArchiveRediscoveryOptions = {
  canOpenSourceUrl?: (url: string) => Promise<boolean>;
  getLocalImageAvailability: (localPath: string | null) => Promise<LocalImageAvailability>;
  availabilityCache?: ArchiveRediscoveryAvailabilityCache;
  availabilityCacheTtlMs?: number;
  now?: number;
};

export function getLocalDayKey(now: number) {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isOldEnoughForRediscovery(snap: Snap, now: number) {
  const timelineDate = getSnapTimelineDate(snap);
  const timelineTime = timelineDate?.getTime();

  return timelineTime !== undefined && Number.isFinite(timelineTime) && timelineTime <= now - ARCHIVE_REDISCOVERY_MIN_AGE_DAYS * DAY_IN_MILLISECONDS;
}

function getDailyScore(dayKey: string, snapId: string) {
  let hash = 2166136261;
  const value = `${dayKey}:${snapId}`;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function compareIds(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function rankDailyArchiveRediscovery(
  snaps: readonly Snap[],
  availabilityByLocalPath: ReadonlyMap<string, LocalImageAvailability>,
  now: number,
): ArchiveRediscoveryItem[] {
  const dayKey = getLocalDayKey(now);

  return snaps
    .filter((snap) => !snap.isArchived && isOldEnoughForRediscovery(snap, now))
    .map((snap): ArchiveRediscoveryItem => ({
      snap,
      hasLocalImage: Boolean(snap.localPath && availabilityByLocalPath.get(snap.localPath) === 'available'),
      normalizedSourceUrl: normalizeSourceUrl(snap.sourceUrl),
    }))
    .filter((item) => item.hasLocalImage || item.normalizedSourceUrl !== null)
    .sort((left, right) => {
      if (left.snap.isFavorite !== right.snap.isFavorite) {
        return Number(right.snap.isFavorite) - Number(left.snap.isFavorite);
      }

      const scoreDifference = getDailyScore(dayKey, left.snap.id) - getDailyScore(dayKey, right.snap.id);
      return scoreDifference || compareIds(left.snap.id, right.snap.id);
    });
}

export function selectDailyArchiveRediscovery(
  snaps: readonly Snap[],
  availabilityByLocalPath: ReadonlyMap<string, LocalImageAvailability>,
  now: number,
) {
  return rankDailyArchiveRediscovery(snaps, availabilityByLocalPath, now).slice(0, ARCHIVE_REDISCOVERY_MAX_ITEMS);
}

export async function loadDailyArchiveRediscovery(
  snaps: readonly Snap[],
  {
    canOpenSourceUrl = async () => true,
    getLocalImageAvailability,
    availabilityCache = new Map(),
    availabilityCacheTtlMs = 5 * 60 * 1000,
    now = Date.now(),
  }: LoadDailyArchiveRediscoveryOptions,
) {
  const potentiallyEligibleSnaps = snaps.filter((snap) => !snap.isArchived && isOldEnoughForRediscovery(snap, now));
  const localPaths = [...new Set(potentiallyEligibleSnaps.map((snap) => snap.localPath).filter((localPath): localPath is string => Boolean(localPath)))];
  const availabilityByLocalPath = new Map<string, LocalImageAvailability>();

  await Promise.all(
    localPaths.map(async (localPath) => {
      const cached = availabilityCache.get(localPath);
      const isCacheFresh = cached && now >= cached.checkedAt && now - cached.checkedAt < availabilityCacheTtlMs;

      if (isCacheFresh) {
        availabilityByLocalPath.set(localPath, cached.availability);
        return;
      }

      let availability: LocalImageAvailability;

      try {
        availability = await getLocalImageAvailability(localPath);
      } catch {
        availability = 'unavailable';
      }

      const newerCached = availabilityCache.get(localPath);

      if (newerCached && newerCached.checkedAt > now) {
        availabilityByLocalPath.set(localPath, newerCached.availability);
      } else {
        availabilityByLocalPath.set(localPath, availability);
        availabilityCache.set(localPath, { availability, checkedAt: now });
      }
    }),
  );

  const ranked = rankDailyArchiveRediscovery(potentiallyEligibleSnaps, availabilityByLocalPath, now);
  const selected: ArchiveRediscoveryItem[] = [];

  for (const item of ranked) {
    if (item.hasLocalImage) {
      selected.push(item);
    } else if (item.normalizedSourceUrl) {
      try {
        if (await canOpenSourceUrl(item.normalizedSourceUrl)) {
          selected.push(item);
        }
      } catch {
        // Unsupported source URLs are simply not rediscovery candidates.
      }
    }

    if (selected.length === ARCHIVE_REDISCOVERY_MAX_ITEMS) {
      break;
    }
  }

  return selected;
}
