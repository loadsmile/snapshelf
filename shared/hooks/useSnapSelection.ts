import { useEffect, useMemo, useState } from 'react';

import type { SnapBulkResult } from '@/features/snaps/api';
import { getVisibleSelectAllState, retainBulkFailures, toggleAllVisibleSnaps, toggleSnapSelection } from '@/features/snaps/selection';

export function useSnapSelection(visibleIds: string[], scopeKey: string) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, [scopeKey]);

  useEffect(() => {
    const visibleIdSet = new Set(visibleIds);
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => visibleIdSet.has(id)));
      if (next.size === current.size) {
        return current;
      }
      if (next.size === 0) {
        setIsSelectionMode(false);
      }
      return next;
    });
  }, [visibleIds]);

  const selectAllState = useMemo(() => getVisibleSelectAllState(selectedIds, visibleIds), [selectedIds, visibleIds]);

  function clear() {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }

  function applyResult(result: SnapBulkResult) {
    setSelectedIds((current) => {
      const next = retainBulkFailures(current, result);
      if (next.size === 0) {
        setIsSelectionMode(false);
      }
      return next;
    });
  }

  return {
    applyResult,
    clear,
    enter: () => setIsSelectionMode(true),
    isSelectionMode,
    selectAllState,
    selectedIds,
    toggle: (snapId: string) => setSelectedIds((current) => toggleSnapSelection(current, snapId)),
    toggleAll: () => setSelectedIds((current) => toggleAllVisibleSnaps(current, visibleIds)),
  };
}
