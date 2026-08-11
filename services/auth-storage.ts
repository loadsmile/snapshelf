import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { createProtectedAuthStorage, type AsyncKeyValueStorage } from '@/features/auth/storage';

const secureStoreAdapter: AsyncKeyValueStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

export const authStorage = Platform.OS === 'web'
  ? AsyncStorage
  : createProtectedAuthStorage(secureStoreAdapter, AsyncStorage);
