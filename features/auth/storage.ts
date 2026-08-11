export type AsyncKeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export function createProtectedAuthStorage(
  secureStorage: AsyncKeyValueStorage,
  legacyStorage: AsyncKeyValueStorage,
): AsyncKeyValueStorage {
  return {
    async getItem(key) {
      const protectedValue = await secureStorage.getItem(key);

      if (protectedValue !== null) {
        return protectedValue;
      }

      const legacyValue = await legacyStorage.getItem(key);

      if (legacyValue !== null) {
        await secureStorage.setItem(key, legacyValue);
        await legacyStorage.removeItem(key);
      }

      return legacyValue;
    },
    async setItem(key, value) {
      await secureStorage.setItem(key, value);
      await legacyStorage.removeItem(key);
    },
    async removeItem(key) {
      await Promise.all([secureStorage.removeItem(key), legacyStorage.removeItem(key)]);
    },
  };
}
