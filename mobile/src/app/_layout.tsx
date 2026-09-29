import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler, Keyboard, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/client';
import { getApiUrl } from '@/api/config';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { ServerForm } from '@/components/ServerForm';
import { ErrorView } from '@/components/StateViews';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

/**
 * On Android the Back key could reach the app while the keyboard was open, leaving the
 * screen (or the app) instead of just closing the keyboard. Close the keyboard first.
 */
function useBackClosesKeyboard() {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!Keyboard.isVisible()) return false;
      Keyboard.dismiss();
      return true;
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Don't retry client errors (401/404...), only flaky network failures.
            retry: (count, err) => count < 2 && err instanceof ApiError && err.isNetwork,
            staleTime: 60_000,
          },
        },
      }),
  );

  // If fonts fail to load, carry on with system fonts rather than blocking the app.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * All routing decisions live here. Each group of screens is only reachable in the
 * matching session state; when the state changes, Expo Router drops the now-forbidden
 * screens and falls back to `index`, which redirects to the right step.
 */
function RootNavigator() {
  const { state, account, retryRestore, signOut } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const [changingServer, setChangingServer] = useState(false);
  useBackClosesKeyboard();

  // The server form shown from the offline screen sits outside the navigator, so Back returns here by hand.
  useEffect(() => {
    if (!changingServer) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (Keyboard.isVisible()) return false; // let the keyboard close first
      setChangingServer(false);
      return true;
    });
    return () => sub.remove();
  }, [changingServer]);

  useEffect(() => {
    if (state.status !== 'loading') void SplashScreen.hideAsync();
  }, [state.status]);

  if (state.status === 'loading') return null; // the native splash stays visible

  if (state.status === 'offline') {
    const retry = async () => {
      setRetrying(true);
      await retryRestore();
      setRetrying(false);
    };
    // A saved session but no server: often the computer's address changed (e.g. a new
    // hotspot), so the address can be fixed here without logging out.
    if (changingServer) {
      return (
        <ServerForm
          onBack={() => setChangingServer(false)}
          onSaved={() => {
            setChangingServer(false);
            void retry();
          }}
        />
      );
    }
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <ErrorView
            title="Can't reach PadosiPro"
            message={`${state.error.message}\n\nServer: ${getApiUrl().replace(/^https?:\/\//, '')}. Check that the backend is running. On a phone, the computer's address changes when you switch Wi-Fi or hotspot.`}
            retrying={retrying}
            onRetry={() => void retry()}
            secondaryActions={[
              { title: 'Change server', onPress: () => setChangingServer(true) },
              { title: 'Log out', onPress: () => void signOut() },
            ]}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const signedIn = account !== null;
  const profileComplete = account?.profileComplete ?? false;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="verify" />
        <Stack.Screen name="server" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !profileComplete}>
        <Stack.Screen name="profile" options={{ gestureEnabled: false }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && profileComplete}>
        <Stack.Screen name="home" options={{ gestureEnabled: false }} />
        <Stack.Screen name="tasks" />
      </Stack.Protected>
    </Stack>
  );
}
