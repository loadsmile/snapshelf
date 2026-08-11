import { describe, expect, it } from 'vitest';

import { searchStacks } from '@/features/stacks/search';

describe('searchStacks', () => {
  const stacks = [
    { id: 'travel', name: 'Summer Travel' },
    { id: 'home', name: 'Home Projects' },
  ];

  it('matches Stack names directly and case-insensitively', () => {
    expect(searchStacks(stacks, 'SUMMER').map((stack) => stack.id)).toEqual(['travel']);
  });

  it('requires every term to match', () => {
    expect(searchStacks(stacks, 'travel summer').map((stack) => stack.id)).toEqual(['travel']);
    expect(searchStacks(stacks, 'travel home')).toEqual([]);
  });
});
