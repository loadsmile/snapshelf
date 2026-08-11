import { describe, expect, it } from 'vitest';

import { getOrganizationNameError, normalizeOrganizationName, validateOrganizationName } from '@/features/organizations/name';

describe('organization name validation', () => {
  it('normalizes surrounding whitespace', () => {
    expect(normalizeOrganizationName('  Summer Plans\n')).toBe('Summer Plans');
    expect(validateOrganizationName('  Summer Plans\n', 'Shelf')).toBe('Summer Plans');
  });

  it('rejects blank names with organization-specific copy', () => {
    expect(getOrganizationNameError(' \n\t ', 'Shelf')).toBe('Shelf name is required.');
    expect(() => validateOrganizationName(' \n\t ', 'Stack')).toThrow('Stack name is required.');
  });

  it('accepts 80 characters and rejects 81 characters', () => {
    expect(getOrganizationNameError('a'.repeat(80), 'Shelf')).toBeNull();
    expect(getOrganizationNameError('a'.repeat(81), 'Shelf')).toBe('Shelf name must be 80 characters or fewer.');
  });

  it('counts Unicode code points consistently with the database', () => {
    expect(getOrganizationNameError('📚'.repeat(80), 'Stack')).toBeNull();
    expect(getOrganizationNameError('📚'.repeat(81), 'Stack')).toBe('Stack name must be 80 characters or fewer.');
  });
});
