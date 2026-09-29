import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { errorMessage } from '@/api/client';
import { DEFAULT_API_URL, getApiUrl, isValidServerUrl, normalizeUrl, setApiUrl } from '@/api/config';
import { api } from '@/api/endpoints';
import { colors, fonts, space, type } from '@/theme/tokens';
import { Banner } from './Banner';
import { Button } from './Button';
import { Header } from './Header';
import { Screen } from './Screen';
import { TextField } from './TextField';

interface Props {
  onBack: () => void;
  onSaved: () => void;
}

/**
 * Lets a tester point an installed APK at their own backend without rebuilding.
 * Used by the Server screen and by the "can't reach the server" start screen.
 */
export function ServerForm({ onBack, onSaved }: Props) {
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
    onSaved();
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
        onBack={onBack}
        eyebrow="Settings"
        title="Server address"
        subtitle="Where the app finds the PadosiPro API: the computer running the backend, on port 4000."
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

      <Text style={styles.heading}>Which address?</Text>
      <Text style={styles.item}>• Android emulator: http://10.0.2.2:4000</Text>
      <Text style={styles.item}>
        • Phone and computer on the same Wi-Fi or hotspot (including this phone’s own hotspot): the computer’s IP
        address on that network, e.g. http://192.168.43.20:4000
      </Text>
      <Text style={styles.item}>
        • Find the IP on the computer: Mac, run “ipconfig getifaddr en0”; Windows, run “ipconfig” and use the IPv4
        address of the Wi-Fi adapter.
      </Text>
      <Text style={styles.item}>• The IP changes when you switch networks. Come back here if the app can’t connect.</Text>

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
  heading: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMutedDeep, marginTop: space.sm, marginBottom: space.xs },
  item: { ...type.small, marginBottom: space.xs },
  reset: { marginTop: space.sm, alignSelf: 'flex-start', paddingHorizontal: 0 },
});
