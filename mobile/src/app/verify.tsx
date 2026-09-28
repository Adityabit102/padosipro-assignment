import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError, errorMessage } from '@/api/client';
import { isLocalServer } from '@/api/config';
import { api } from '@/api/endpoints';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { OtpInput, type OtpInputHandle } from '@/components/OtpInput';
import { Screen } from '@/components/Screen';
import { ServerErrorBanner } from '@/components/ServerErrorBanner';
import { colors, fonts, space, type } from '@/theme/tokens';
import { maskEmail } from '@/utils/validation';

type Notice = { tone: 'error' | 'success' | 'info' | 'warning'; message: string } | null;

/** Seconds left until `deadline`, refreshed every second. */
function useCountdown(initialSeconds: number) {
  const [deadline, setDeadline] = useState(() => Date.now() + initialSeconds * 1000);
  const [now, setNow] = useState(() => Date.now());
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));

  useEffect(() => {
    if (remaining === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const restart = useCallback((seconds: number) => {
    setNow(Date.now());
    setDeadline(Date.now() + seconds * 1000);
  }, []);
  return [remaining, restart] as const;
}

/** Leaves the sign-up screens behind: Log in becomes the only screen in history. */
function goToLogin(email: string) {
  if (router.canDismiss()) router.dismissAll();
  router.replace({ pathname: '/login', params: { email, verified: '1' } });
}

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ email: string; retryAfter?: string; fromLogin?: string }>();
  const email = params.email ?? '';
  const otpRef = useRef<OtpInputHandle>(null);

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [notice, setNotice] = useState<Notice>(
    params.fromLogin === '1'
      ? { tone: 'info', message: 'Your email is not verified yet. Enter the code we sent to continue.' }
      : null,
  );
  // Expired or locked: the only way forward is a new code.
  const [needsNewCode, setNeedsNewCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [offline, setOffline] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, restartCountdown] = useCountdown(Number(params.retryAfter ?? 30) || 0);

  const verify = async (value = code) => {
    if (verifying) return;
    if (value.length !== 6) {
      setCodeError(true);
      setNotice({ tone: 'error', message: 'Enter all 6 digits of the code.' });
      return;
    }
    setVerifying(true);
    setNotice(null);
    setOffline(false);
    try {
      await api.verifyEmail(email, value);
      goToLogin(email);
    } catch (err) {
      if (err instanceof ApiError && err.isNetwork) {
        setOffline(true);
        return;
      }
      setCodeError(true);
      if (!(err instanceof ApiError)) {
        setNotice({ tone: 'error', message: errorMessage(err) });
        return;
      }
      switch (err.code) {
        case 'OTP_INVALID':
          setCode('');
          setNotice({ tone: 'error', message: err.message });
          otpRef.current?.focus();
          break;
        case 'OTP_EXPIRED':
        case 'OTP_LOCKED':
        case 'OTP_NOT_FOUND':
          setNeedsNewCode(true);
          setNotice({ tone: 'warning', message: err.message });
          break;
        case 'EMAIL_ALREADY_VERIFIED':
          goToLogin(email);
          break;
        default:
          setNotice({ tone: 'error', message: err.message });
      }
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (resending || resendIn > 0) return;
    setResending(true);
    setOffline(false);
    try {
      const res = await api.resendOtp(email);
      restartCountdown(res.retryAfterSec);
      setCode('');
      setCodeError(false);
      setNeedsNewCode(false);
      setNotice({ tone: 'success', message: `We sent a new code to ${maskEmail(email)}.` });
      otpRef.current?.focus();
    } catch (err) {
      if (err instanceof ApiError && err.isNetwork) {
        setOffline(true);
        return;
      }
      if (err instanceof ApiError && err.code === 'RESEND_TOO_SOON') {
        restartCountdown(Number(err.details.retryAfterSec ?? 30));
      }
      setNotice({ tone: 'error', message: errorMessage(err) });
    } finally {
      setResending(false);
    }
  };

  // Opened without an email (e.g. a stale link): nothing to verify, go to login.
  if (!email) return <Redirect href="/login" />;

  const mm = Math.floor(resendIn / 60);
  const ss = String(resendIn % 60).padStart(2, '0');

  return (
    <Screen
      footer={
        needsNewCode ? (
          <Button title="Send a new code" icon="refresh-cw" onPress={resend} loading={resending} disabled={resendIn > 0} />
        ) : (
          <Button title="Verify" onPress={() => verify()} loading={verifying} disabled={code.length !== 6} />
        )
      }
    >
      <Header
        back
        eyebrow="Verify email"
        title="Enter 6-digit code"
        subtitle={`We sent a verification code to ${maskEmail(email)}. It expires in 10 minutes.`}
      />

      {offline ? <ServerErrorBanner onDismiss={() => setOffline(false)} /> : null}
      {notice ? <Banner tone={notice.tone} message={notice.message} /> : null}

      <OtpInput
        ref={otpRef}
        value={code}
        onChange={(v) => {
          setCode(v);
          if (codeError) setCodeError(false);
        }}
        onComplete={(v) => void verify(v)}
        error={codeError}
        disabled={verifying || needsNewCode}
      />

      <View style={styles.resendRow}>
        <Text style={type.small}>Didn’t get the code? </Text>
        {resendIn > 0 ? (
          <Text style={styles.countdown} accessibilityLiveRegion="polite">
            Resend in {mm}:{ss}
          </Text>
        ) : (
          <Pressable onPress={resend} disabled={resending} hitSlop={12} accessibilityRole="button">
            <Text style={styles.link}>{resending ? 'Sending…' : 'Resend code'}</Text>
          </Pressable>
        )}
      </View>
      {isLocalServer() ? (
        <View style={styles.mailpit}>
          <Text style={styles.mailpitTitle}>Testing with the local backend?</Text>
          <Text style={type.small}>
            The email is in Mailpit. Open http://localhost:8025 on the computer running the backend.
          </Text>
        </View>
      ) : (
        <Text style={styles.tip}>Check your spam or promotions folder too.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  resendRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', minHeight: 40 },
  countdown: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMutedDeep, fontVariant: ['tabular-nums'] },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  tip: { ...type.small, marginTop: space.sm },
  mailpit: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: 12,
    backgroundColor: colors.tealMuted,
  },
  mailpitTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primaryDeep, marginBottom: 2 },
});
