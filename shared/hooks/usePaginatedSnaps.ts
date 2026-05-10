import { useCallback, useEffect, useRef, useState } from 'react';

import { listShelfSnaps, listTraySnaps, subscribeToShelfSnaps, subscribeToTraySnaps, type SnapCursor } from '@/features/snaps/api';
import { appendUniqueSnaps, mergeFirstPageSnaps } from '@/features/snaps/pagination';
import type { Snap } from '@/features/snaps/types';

const PAGE_SIZE = 20;

export function usePaginatedSnaps(userId: string | null | undefined, shelfId: string | null | undefined) {
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<SnapCursor | null>(null);
  const hasLoadedAdditionalPagesRef = useRef(false);
  const firstPageIdsRef = useRef<Set<string> | undefined>(undefined);

  useEffect(() => {
    if (!userId) {
      setSnaps([]);
      setLoading(false);
      setLoadingMore(false);
      setHasMore(false);
      setError(null);
      cursorRef.current = null;
      hasLoadedAdditionalPagesRef.current = false;
      firstPageIdsRef.current = undefined;
      return;
    }

    if (shelfId === undefined) {
      setSnaps([]);
      setLoading(false);
      setLoadingMore(false);
      setHasMore(false);
      setError(null);
      cursorRef.current = null;
      hasLoadedAdditionalPagesRef.current = false;
      firstPageIdsRef.current = undefined;
      return;
    }

    setSnaps([]);
    setLoading(true);
    setLoadingMore(false);
    setHasMore(true);
    setError(null);
    cursorRef.current = null;
    hasLoadedAdditionalPagesRef.current = false;
    firstPageIdsRef.current = undefined;

    const handleUpdate = (nextSnaps: Snap[], nextCursor: SnapCursor | null) => {
      setSnaps((current) => mergeFirstPageSnaps(current, nextSnaps, firstPageIdsRef.current));
      firstPageIdsRef.current = new Set(nextSnaps.map((snap) => snap.id));

      if (!hasLoadedAdditionalPagesRef.current) {
        cursorRef.current = nextCursor;
        setHasMore(nextSnaps.length === PAGE_SIZE);
      }

      setError(null);
      setLoading(false);
    };

    const handleError = (nextError: Error) => {
      setError(nextError.message);
      setLoading(false);
      setLoadingMore(false);
    };

    const unsubscribe = shelfId === null ? subscribeToTraySnaps(userId, handleUpdate, handleError, undefined, PAGE_SIZE) : subscribeToShelfSnaps(userId, shelfId, handleUpdate, handleError, undefined, PAGE_SIZE);

    return unsubscribe;
  }, [shelfId, userId]);

  const loadMore = useCallback(async () => {
    if (!userId || shelfId === undefined || !hasMore || loadingMore || !cursorRef.current) {
      return;
    }

    setLoadingMore(true);

    try {
      const nextPage = shelfId === null ? await listTraySnaps(userId, cursorRef.current, PAGE_SIZE) : await listShelfSnaps(userId, shelfId, cursorRef.current, PAGE_SIZE);

      hasLoadedAdditionalPagesRef.current = true;
      cursorRef.current = nextPage.cursor ?? cursorRef.current;
      setSnaps((current) => appendUniqueSnaps(current, nextPage.snaps));
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
