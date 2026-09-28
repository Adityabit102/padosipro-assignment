import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, setAuthToken, setUnauthorizedHandler } from '@/api/client';
import { loadApiUrl } from '@/api/config';
import { api } from '@/api/endpoints';
import type { Account } from '@/api/types';
import { tokenStorage } from './tokenStorage';

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; account: Account }
  /** A token is saved but the server couldn't be reached to restore the session. */
  | { status: 'offline'; error: ApiError };

interface AuthContextValue {
  state: AuthState;
  account: Account | null;
  signIn: (token: string, account: Account) => Promise<void>;
  signOut: () => Promise<void>;
  /** Replace the cached account after a mutation (profile saved, tasks saved). */
  setAccount: (account: Account) => void;
  /** Retry restoring the session after an offline start. */
  retryRestore: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const queryClient = useQueryClient();

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    queryClient.clear();
    await tokenStorage.clear();
    setState({ status: 'signedOut' });
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    void readSession().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // Any 401 on an authenticated call means the token expired or was revoked.
    setUnauthorizedHandler(() => void clearSession());
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const signIn = useCallback(async (token: string, account: Account) => {
    await tokenStorage.set(token);
    setAuthToken(token);
    setState({ status: 'signedIn', account });
  }, []);

  const setAccount = useCallback((account: Account) => {
    setState((s) => (s.status === 'signedIn' ? { status: 'signedIn', account } : s));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      account: state.status === 'signedIn' ? state.account : null,
      signIn,
      signOut: clearSession,
      setAccount,
      retryRestore: async () => {
        setState({ status: 'loading' });
        setState(await readSession());
      },
    }),
    [state, signIn, clearSession, setAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Restores the session saved on this device: token from secure storage, account from the server. */
async function readSession(): Promise<AuthState> {
  await loadApiUrl();
  const token = await tokenStorage.get();
  if (!token) return { status: 'signedOut' };

  setAuthToken(token);
  try {
    return { status: 'signedIn', account: await api.me() };
  } catch (err) {
    // Server unreachable: keep the token, the user is still logged in.
    if (err instanceof ApiError && err.isNetwork) return { status: 'offline', error: err };
    // Token rejected (expired, user gone): forget it.
    setAuthToken(null);
    await tokenStorage.clear();
    return { status: 'signedOut' };
  }
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
