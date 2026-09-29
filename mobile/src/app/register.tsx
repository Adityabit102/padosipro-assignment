import { router, useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import { ApiError, errorMessage } from '@/api/client';
import { getApiUrl } from '@/api/config';
import { api } from '@/api/endpoints';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { ServerErrorBanner } from '@/components/ServerErrorBanner';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, fonts, space, type } from '@/theme/tokens';
import { validateConfirmPassword, validateEmail, validatePassword } from '@/utils/validation';

type Field = 'email' | 'password' | 'confirm';

export default function RegisterScreen() {
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [values, setValues] = useState<Record<Field, string>>({ email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [unreachableUrl, setUnreachableUrl] = useState<string | null>(null);
  useIsFocused(); // re-render when coming back from the Server screen
  const [submitting, setSubmitting] = useState(false);

  const clientErrors: Record<Field, string | null> = {
    email: validateEmail(values.email),
    password: validatePassword(values.password),
    confirm: validateConfirmPassword(values.password, values.confirm),
  };
  // Show a field's error once it has been left (or on submit), then update it live as they type.
  const errorFor = (f: Field) => serverErrors[f] ?? (touched[f] ? clientErrors[f] : null);

  const set = (f: Field) => (v: string) => {
    setValues((s) => ({ ...s, [f]: v }));
    setServerErrors((s) => ({ ...s, [f]: undefined }));
  };
  const touch = (f: Field) => () => values[f] && setTouched((t) => ({ ...t, [f]: true }));

  const submit = async () => {
    setTouched({ email: true, password: true, confirm: true });
    setFormError(null);
    setUnreachableUrl(null);
    if (clientErrors.email || clientErrors.password || clientErrors.confirm || submitting) return;

    setSubmitting(true);
    try {
      const res = await api.register(values.email.trim(), values.password);
      router.push({ pathname: '/verify', params: { email: res.email, retryAfter: String(res.retryAfterSec) } });
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'VALIDATION_ERROR' || err.code === 'EMAIL_TAKEN')) {
        setServerErrors(err.fields);
        if (!Object.keys(err.fields).length) setFormError(err.message);
      } else if (err instanceof ApiError && err.isNetwork) {
        setUnreachableUrl(getApiUrl());
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
          <Button title="Create account" onPress={submit} loading={submitting} />
          <View style={styles.switchRow}>
            <Text style={type.small}>Already have an account? </Text>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
              hitSlop={10}
              accessibilityRole="link"
            >
              <Text style={styles.link}>Log in</Text>
            </Pressable>
          </View>
        </>
      }
    >
      <Header
        title="Create your account"
        subtitle="Tell us what your household needs. Your Lifestyle Manager takes it from there."
      />
      {unreachableUrl === getApiUrl() ? <ServerErrorBanner onDismiss={() => setUnreachableUrl(null)} /> : null}
      {formError ? <Banner tone="error" message={formError} /> : null}

      <TextField
        label="Email"
        icon="mail"
        placeholder="you@example.com"
        value={values.email}
        onChangeText={set('email')}
        onBlur={touch('email')}
        error={errorFor('email')}
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
        placeholder="At least 8 characters"
        value={values.password}
        onChangeText={set('password')}
        onBlur={touch('password')}
        error={errorFor('password')}
        hint="At least 8 characters, with a letter and a number"
        secureToggle
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={confirmRef}
        label="Confirm password"
        icon="lock"
        placeholder="Re-enter your password"
        value={values.confirm}
        onChangeText={set('confirm')}
        onBlur={touch('confirm')}
        error={errorFor('confirm')}
        secureToggle
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Text style={styles.note}>We’ll email you a 6-digit code to verify your address.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: space.md, minHeight: 32 },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  note: { ...type.small, marginTop: space.xs },
});
