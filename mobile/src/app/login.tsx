import { Link, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import { ApiError, errorMessage } from '@/api/client';
import { getApiUrl } from '@/api/config';
import { api } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, fonts, space, type } from '@/theme/tokens';
import { validateEmail } from '@/utils/validation';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string; verified?: string }>();
  const { signIn } = useAuth();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const next = { email: validateEmail(email), password: password ? null : 'Password is required' };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password || submitting) return;

    setSubmitting(true);
    try {
      const { token, user } = await api.login(email.trim(), password);
      await signIn(token, user); // the navigator moves on to the next step
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        router.push({
          pathname: '/verify',
          params: {
            email: String(err.details.email ?? email.trim()),
            retryAfter: String(err.details.retryAfterSec ?? 0),
            fromLogin: '1',
          },
        });
      } else if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        setErrors(err.fields);
      } else {
        setFormError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          <Button title="Log in" onPress={submit} loading={submitting} />
          <View style={styles.switchRow}>
            <Text style={type.small}>New to PadosiPro? </Text>
            <Link href="/register" replace asChild>
              <Pressable hitSlop={10} accessibilityRole="link">
                <Text style={styles.link}>Create an account</Text>
              </Pressable>
            </Link>
          </View>
        </>
      }
    >
      <Header title="Welcome back" subtitle="You don't manage tasks — we do. Log in to continue." />

      {params.verified === '1' && !formError ? (
        <Banner tone="success" message="Email verified. Log in to continue." />
      ) : null}
      {formError ? <Banner tone="error" message={formError} /> : null}

      <TextField
        label="Email"
        icon="mail"
        placeholder="you@example.com"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (errors.email) setErrors((e) => ({ ...e, email: validateEmail(v) }));
        }}
        onBlur={() => email && setErrors((e) => ({ ...e, email: validateEmail(email) }))}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={passwordRef}
        label="Password"
        icon="lock"
        placeholder="Your password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (errors.password) setErrors((e) => ({ ...e, password: null }));
        }}
        error={errors.password}
        secureToggle
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <View style={styles.spacer} />
      <Link href="/server" asChild>
        <Pressable style={styles.server} accessibilityRole="button" accessibilityLabel="Change server address">
          <Text style={styles.serverText} numberOfLines={1}>
            Server: {getApiUrl().replace(/^https?:\/\//, '')} · <Text style={styles.link}>Change</Text>
          </Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: space.md, minHeight: 32 },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  spacer: { flex: 1, minHeight: space.lg },
  server: { alignSelf: 'center', paddingVertical: space.sm, minHeight: 40, justifyContent: 'center' },
  serverText: { ...type.small, fontSize: 12 },
});
