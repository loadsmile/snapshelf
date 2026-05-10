import { getSnapSourceLabel } from '@/features/snaps/presentation';
import { searchSnaps } from '@/features/snaps/search';
import type { Snap, SnapSource } from '@/features/snaps/types';

export type SnapLibraryDateRange = 'any' | '7d' | '30d' | '90d' | 'year';
export type SnapLibrarySort = 'newest' | 'oldest' | 'updated' | 'favorites';
export type SnapLibraryStatus = 'active' | 'archived' | 'all';
export type SnapLibraryShelfFilter = 'all' | 'tray' | string;

export type SnapLibraryFilters = {
  query: string;
  shelfId: SnapLibraryShelfFilter;
  source: SnapSource | 'all';
  label: string | 'all';
  dateRange: SnapLibraryDateRange;
  status: SnapLibraryStatus;
  favoritesOnly: boolean;
  sort: SnapLibrarySort;
};

export function getSnapTimelineDate(snap: Snap) {
  return snap.capturedAt ?? snap.createdAt ?? snap.updatedAt ?? null;
}

function getSnapSearchContext(snap: Snap, shelfNamesById: Map<string, string>) {
  const shelfName = snap.shelfId ? shelfNamesById.get(snap.shelfId) ?? null : 'tray';
  return [shelfName, getSnapSourceLabel(snap.source)].filter(Boolean).join(' ');
}

function matchesDateRange(snap: Snap, dateRange: SnapLibraryDateRange, now: number) {
  if (dateRange === 'any') {
    return true;
  }

  const timelineDate = getSnapTimelineDate(snap);
  if (!timelineDate) {
    return false;
  }

  const age = now - timelineDate.getTime();
  const day = 1000 * 60 * 60 * 24;

  if (dateRange === '7d') {
    return age <= day * 7;
  }

  if (dateRange === '30d') {
    return age <= day * 30;
  }

  if (dateRange === '90d') {
    return age <= day * 90;
  }

  return timelineDate.getFullYear() === new Date(now).getFullYear();
}

function compareDates(left: Date | null, right: Date | null, direction: 'asc' | 'desc') {
  const leftTime = left?.getTime() ?? 0;
  const rightTime = right?.getTime() ?? 0;
  return direction === 'asc' ? leftTime - rightTime : rightTime - leftTime;
}

export function sortLibrarySnaps(snaps: Snap[], sort: SnapLibrarySort) {
  return [...snaps].sort((left, right) => {
    if (sort === 'oldest') {
      return compareDates(getSnapTimelineDate(left), getSnapTimelineDate(right), 'asc');
    }

    if (sort === 'updated') {
      return compareDates(left.updatedAt, right.updatedAt, 'desc');
    }

    if (sort === 'favorites') {
      if (left.isFavorite !== right.isFavorite) {
        return Number(right.isFavorite) - Number(left.isFavorite);
      }

      return compareDates(left.favoritedAt ?? getSnapTimelineDate(left), right.favoritedAt ?? getSnapTimelineDate(right), 'desc');
    }

    return compareDates(getSnapTimelineDate(left), getSnapTimelineDate(right), 'desc');
  });
}

export function filterLibrarySnaps(snaps: Snap[], filters: SnapLibraryFilters, shelfNamesById: Map<string, string>, now: number = Date.now()) {
  const searchedSnaps = searchSnaps(snaps, filters.query, (snap) => getSnapSearchContext(snap, shelfNamesById));

  return sortLibrarySnaps(
    searchedSnaps.filter((snap) => {
      if (filters.status === 'active' && snap.isArchived) {
        return false;
      }

      if (filters.status === 'archived' && !snap.isArchived) {
        return false;
      }

      if (filters.shelfId === 'tray' && snap.shelfId !== null) {
        return false;
      }

      if (filters.shelfId !== 'all' && filters.shelfId !== 'tray' && snap.shelfId !== filters.shelfId) {
        return false;
      }

      if (filters.source !== 'all' && snap.source !== filters.source) {
        return false;
      }

      if (filters.label !== 'all' && !snap.labels.includes(filters.label)) {
        return false;
      }

      if (filters.favoritesOnly && !snap.isFavorite) {
        return false;
      }

      return matchesDateRange(snap, filters.dateRange, now);
    }),
    filters.sort,
  );
}

export function collectSnapLabels(snaps: Snap[]) {
  return Array.from(new Set(snaps.flatMap((snap) => snap.labels))).sort((left, right) => left.localeCompare(right));
}
