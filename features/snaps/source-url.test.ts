import { describe, expect, it } from 'vitest';

import { normalizeSourceUrl } from '@/features/snaps/source-url';

describe('normalizeSourceUrl', () => {
  it('normalizes public HTTPS URLs', () => {
    expect(normalizeSourceUrl(' https://example.com/products/chair ')).toBe('https://example.com/products/chair');
  });

  it('rejects non-HTTPS and credentialed URLs', () => {
    expect(normalizeSourceUrl('http://example.com')).toBeNull();
    expect(normalizeSourceUrl('https://user:password@example.com')).toBeNull();
  });

  it('rejects local and private network hosts', () => {
    expect(normalizeSourceUrl('https://localhost/page')).toBeNull();
    expect(normalizeSourceUrl('https://192.168.1.2/page')).toBeNull();
    expect(normalizeSourceUrl('https://service.local/page')).toBeNull();
  });
});
