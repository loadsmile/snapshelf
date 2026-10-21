import type { SnapLibraryDateRange, SnapLibrarySort, SnapLibraryStatus } from '@/features/snaps/library';
import type { SnapSource } from '@/features/snaps/types';

export const snapSourceOptions: Array<{ label: string; value: SnapSource | 'all' }> = [
  { label: 'All Sources', value: 'all' },
  { label: 'Camera Roll', value: 'camera-roll' },
  { label: 'Web Clip', value: 'web-clip' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'Quick Snap', value: 'quick-snap' },
  { label: 'Manual', value: 'manual' },
  { label: 'Unknown', value: 'unknown' },
];

export const snapDateOptions: Array<{ label: string; value: SnapLibraryDateRange }> = [
  { label: 'Any Time', value: 'any' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: 'This Year', value: 'year' },
];

export const snapSortOptions: Array<{ label: string; value: SnapLibrarySort }> = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Updated', value: 'updated' },
  { label: 'Favorites First', value: 'favorites' },
];

export const snapStatusOptions: Array<{ label: string; value: SnapLibraryStatus }> = [
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
  { label: 'All', value: 'all' },
];
