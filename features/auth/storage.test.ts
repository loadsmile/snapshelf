import { describe, expect, it, vi } from 'vitest';

import { createProtectedAuthStorage } from '@/features/auth/storage';

function createStorage(initialValue: string | null = null) {
  return {
    getItem: vi.fn().mockResolvedValue(initialValue),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  };
}

describe('createProtectedAuthStorage', () => {
  it('reads an existing protected session without consulting legacy storage', async () => {
    const secureStorage = createStorage('protected-session');
    const legacyStorage = createStorage('legacy-session');
    const storage = createProtectedAuthStorage(secureStorage, legacyStorage);

    await expect(storage.getItem('auth-key')).resolves.toBe('protected-session');
    expect(legacyStorage.getItem).not.toHaveBeenCalled();
  });

  it('moves an existing AsyncStorage session into protected storage', async () => {
    const secureStorage = createStorage();
    const legacyStorage = createStorage('legacy-session');
    const storage = createProtectedAuthStorage(secureStorage, legacyStorage);

    await expect(storage.getItem('auth-key')).resolves.toBe('legacy-session');
    expect(secureStorage.setItem).toHaveBeenCalledWith('auth-key', 'legacy-session');
    expect(legacyStorage.removeItem).toHaveBeenCalledWith('auth-key');
  });

  it('removes stale legacy values when writing or deleting a session', async () => {
    const secureStorage = createStorage();
    const legacyStorage = createStorage();
    const storage = createProtectedAuthStorage(secureStorage, legacyStorage);

    await storage.setItem('auth-key', 'new-session');
    await storage.removeItem('auth-key');

    expect(secureStorage.setItem).toHaveBeenCalledWith('auth-key', 'new-session');
    expect(secureStorage.removeItem).toHaveBeenCalledWith('auth-key');
    expect(legacyStorage.removeItem).toHaveBeenCalledTimes(2);
  });
});
