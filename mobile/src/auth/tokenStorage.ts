import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'padosipro.token';

/**
 * Where the session token lives: the OS keychain/keystore via SecureStore on
 * Android/iOS. The web build (used only for quick previews) falls back to localStorage.
 */
export const tokenStorage = {
  async get(): Promise<string | null> {
    try {
      return Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) ?? null : await SecureStore.getItemAsync(KEY);
    } catch {
      return null;
    }
  },
  async set(token: string): Promise<void> {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, token);
    else await SecureStore.setItemAsync(KEY, token);
  },
  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') globalThis.localStorage?.removeItem(KEY);
      else await SecureStore.deleteItemAsync(KEY);
    } catch {
      // Nothing stored: nothing to clear.
    }
  },
};
