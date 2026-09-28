import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { errorMessage } from '@/api/client';
import { DEFAULT_API_URL, getApiUrl, isValidServerUrl, normalizeUrl, setApiUrl } from '@/api/config';
import { api } from '@/api/endpoints';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { space, type } from '@/theme/tokens';

/**
 * Lets a reviewer point an installed APK at their own backend without rebuilding.
 * Reached from the "Server" link on the Log in screen.
 */
export default function ServerScreen() {
  const [url, setUrl] = useState(getApiUrl());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const validate = () => {
    const e = isValidServerUrl(url) ? null : 'Enter an address like http://192.168.1.20:4000';
    setError(e);
    return !e;
  };

  const test = async () => {
    if (!validate()) return;
    setTesting(true);
    setResult(null);
    try {
      // Only Save changes the stored address; testing leaves it alone.
      await api.health(normalizeUrl(url));
      setResult({ ok: true, message: 'Connected. The server is reachable.' });
    } catch (err) {
      setResult({ ok: false, message: errorMessage(err) });
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!validate()) return;
    await setApiUrl(url);
    router.back();
  };

  return (
    <Screen
      footer={
        <>
          <Button title="Save" onPress={save} />
          <Button title="Test connection" variant="ghost" onPress={test} loading={testing} style={styles.secondary} />
        </>
      }
    >
      <Header
        back
        eyebrow="Settings"
        title="Server address"
        subtitle="Where the app finds the PadosiPro API. Use your computer's address on the same Wi-Fi."
      />
      {result ? <Banner tone={result.ok ? 'success' : 'error'} message={result.message} /> : null}
      <TextField
        label="API base URL"
        icon="server"
        value={url}
        onChangeText={(v) => {
          setUrl(v);
          setError(null);
          setResult(null);
        }}
        onBlur={() => setUrl((u) => (u.trim() ? normalizeUrl(u) : u))}
        error={error}
        placeholder="http://192.168.1.20:4000"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Text style={type.small}>• Android emulator: http://10.0.2.2:4000</Text>
      <Text style={type.small}>• Real phone: http://&lt;your computer’s LAN IP&gt;:4000</Text>
      <Button
        title={`Reset to default (${DEFAULT_API_URL.replace(/^https?:\/\//, '')})`}
        variant="ghost"
        onPress={() => {
          setUrl(DEFAULT_API_URL);
          setError(null);
          setResult(null);
        }}
        style={styles.reset}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  secondary: { marginTop: space.xs },
  reset: { marginTop: space.md, alignSelf: 'flex-start', paddingHorizontal: 0 },
});
