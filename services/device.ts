import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'snapshelf.installation-id';
const LEGACY_DEVICE_ID_KEY = 'snapshelf:installation-id';

let deviceIdPromise: Promise<string> | null = null;

async function readDeviceId() {
  const deviceId = Platform.OS === 'web'
    ? await AsyncStorage.getItem(DEVICE_ID_KEY)
    : await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (deviceId) {
    return deviceId;
  }

  if (Platform.OS !== 'web') {
    return null;
  }

  const legacyDeviceId = await AsyncStorage.getItem(LEGACY_DEVICE_ID_KEY);
  if (legacyDeviceId) {
    await AsyncStorage.setItem(DEVICE_ID_KEY, legacyDeviceId);
    await AsyncStorage.removeItem(LEGACY_DEVICE_ID_KEY);
  }

  return legacyDeviceId;
}

async function writeDeviceId(deviceId: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    return;
  }

  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
}

export function getDeviceId(): Promise<string> {
  if (!deviceIdPromise) {
    deviceIdPromise = (async () => {
      const existingDeviceId = await readDeviceId();

      if (existingDeviceId) {
        return existingDeviceId;
      }

      const deviceId = Crypto.randomUUID();
      await writeDeviceId(deviceId);
      return deviceId;
    })().catch((error) => {
      deviceIdPromise = null;
      throw error;
    });
  }

  return deviceIdPromise;
}
