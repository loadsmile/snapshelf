import { searchOrganizations } from '@/features/organizations/search';

export function searchShelves<T extends { name: string }>(shelves: T[], query: string) {
  return searchOrganizations(shelves, query);
}
