import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'padosipro.apiUrl';

/** Build-time default, see .env.example. 10.0.2.2 is the Android emulator's alias for the host machine. */
export const DEFAULT_API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000').replace(/\/+$/, '');

let current = DEFAULT_API_URL;

export function getApiUrl(): string {
  return current;
}

/** Loads a server URL saved from the in-app "Server" setting, if any. */
export async function loadApiUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) current = saved;
  } catch {
    // Storage unavailable: keep the build-time default.
  }
  return current;
}

export async function setApiUrl(url: string | null): Promise<string> {
  const next = url ? normalizeUrl(url) : DEFAULT_API_URL;
  current = next;
  if (next === DEFAULT_API_URL) await AsyncStorage.removeItem(STORAGE_KEY);
  else await AsyncStorage.setItem(STORAGE_KEY, next);
  return next;
}

export function normalizeUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url;
}

/** True for localhost, the emulator alias and private LAN addresses, i.e. a local test backend. */
export function isLocalServer(url: string = current): boolean {
  const host = url.replace(/^https?:\/\//i, '').split(/[:/]/)[0] ?? '';
  return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|\.local$/.test(host);
}

export function isValidServerUrl(input: string): boolean {
  return /^https?:\/\/[^\s/:]+(:\d{1,5})?(\/.*)?$/i.test(normalizeUrl(input));
}
