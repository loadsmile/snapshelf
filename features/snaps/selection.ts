import type { SnapBulkResult } from '@/features/snaps/api';

export type SelectAllState = false | true | 'mixed';

export function toggleSnapSelection(selectedIds: Set<string>, snapId: string) {
  const next = new Set(selectedIds);
  if (next.has(snapId)) {
    next.delete(snapId);
  } else {
    next.add(snapId);
  }
  return next;
}

export function getVisibleSelectAllState(selectedIds: Set<string>, visibleIds: string[]): SelectAllState {
  if (visibleIds.length === 0) {
    return false;
  }

  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  if (selectedVisibleCount === 0) {
    return false;
  }
  return selectedVisibleCount === visibleIds.length ? true : 'mixed';
}

export function toggleAllVisibleSnaps(selectedIds: Set<string>, visibleIds: string[]) {
  const next = new Set(selectedIds);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => next.has(id));

  for (const id of visibleIds) {
    if (allVisibleSelected) {
      next.delete(id);
    } else {
      next.add(id);
    }
  }

  return next;
}

export function retainBulkFailures(selectedIds: Set<string>, result: SnapBulkResult) {
  const next = new Set(selectedIds);
  for (const id of result.succeededIds) {
    next.delete(id);
  }
  for (const failure of result.failures) {
    next.add(failure.snapId);
  }
  return next;
}
