import { searchOrganizations } from '@/features/organizations/search';

export function searchStacks<T extends { name: string }>(stacks: T[], query: string) {
  return searchOrganizations(stacks, query);
}
