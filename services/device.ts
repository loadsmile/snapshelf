import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'snapshelf:installation-id';

let deviceIdPromise: Promise<string> | null = null;

async function readDeviceId() {
  return Platform.OS === 'web'
    ? AsyncStorage.getItem(DEVICE_ID_KEY)
    : SecureStore.getItemAsync(DEVICE_ID_KEY);
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
