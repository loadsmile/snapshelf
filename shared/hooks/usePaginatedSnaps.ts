import { useCallback, useEffect, useRef, useState } from 'react';

import { listShelfSnaps, listTraySnaps, subscribeToShelfSnaps, subscribeToTraySnaps, type SnapCursor } from '@/features/snaps/api';
import { appendUniqueSnaps } from '@/features/snaps/pagination';
import type { Snap } from '@/features/snaps/types';

const PAGE_SIZE = 20;

export function usePaginatedSnaps(userId: string | null | undefined, shelfId: string | null | undefined) {
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<SnapCursor | null>(null);
  const loadedCountRef = useRef(PAGE_SIZE);

  useEffect(() => {
    if (!userId) {
      setSnaps([]);
      setLoading(false);
      setLoadingMore(false);
      setHasMore(false);
      setError(null);
      cursorRef.current = null;
      loadedCountRef.current = PAGE_SIZE;
      return;
    }

    if (shelfId === undefined) {
      setSnaps([]);
      setLoading(false);
      setLoadingMore(false);
      setHasMore(false);
      setError(null);
      cursorRef.current = null;
      loadedCountRef.current = PAGE_SIZE;
      return;
    }

    setSnaps([]);
    setLoading(true);
    setLoadingMore(false);
    setHasMore(true);
    setError(null);
    cursorRef.current = null;
    loadedCountRef.current = PAGE_SIZE;

    const handleUpdate = (nextSnaps: Snap[], nextCursor: SnapCursor | null, requestedCount: number) => {
      if (requestedCount < loadedCountRef.current) {
        return;
      }

      setSnaps(nextSnaps);
      loadedCountRef.current = Math.max(PAGE_SIZE, nextSnaps.length);
      cursorRef.current = nextCursor;
      setHasMore(nextSnaps.length === requestedCount);

      setError(null);
      setLoading(false);
    };

    const handleError = (nextError: Error) => {
      setError(nextError.message);
      setLoading(false);
      setLoadingMore(false);
    };

    const getLoadedCount = () => loadedCountRef.current;
    const unsubscribe = shelfId === null
      ? subscribeToTraySnaps(userId, handleUpdate, handleError, undefined, getLoadedCount)
      : subscribeToShelfSnaps(userId, shelfId, handleUpdate, handleError, undefined, getLoadedCount);

    return unsubscribe;
  }, [shelfId, userId]);

  const loadMore = useCallback(async () => {
    if (!userId || shelfId === undefined || !hasMore || loadingMore || !cursorRef.current) {
      return;
    }

    setLoadingMore(true);

    try {
      const nextPage = shelfId === null ? await listTraySnaps(userId, cursorRef.current, PAGE_SIZE) : await listShelfSnaps(userId, shelfId, cursorRef.current, PAGE_SIZE);

      cursorRef.current = nextPage.cursor ?? cursorRef.current;
      setSnaps((current) => {
        const nextSnaps = appendUniqueSnaps(current, nextPage.snaps);
        loadedCountRef.current = Math.max(PAGE_SIZE, nextSnaps.length);
        return nextSnaps;
      });
      setHasMore(nextPage.snaps.length === PAGE_SIZE);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load more Snaps right now.');
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, shelfId, userId]);

  return { error, hasMore, loadMore, loading, loadingMore, snaps };
}
