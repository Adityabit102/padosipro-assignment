import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, space, type } from '@/theme/tokens';
import { Button } from './Button';

export function LoadingView({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.body, styles.loadingText]}>{label}</Text>
    </View>
  );
}

interface ErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  secondaryActions?: { title: string; onPress: () => void }[];
}

export function ErrorView({ title = 'Something went wrong', message, onRetry, retrying, secondaryActions = [] }: ErrorProps) {
  return (
    <View style={styles.center} accessibilityRole="alert">
      <View style={[styles.iconCircle, { backgroundColor: colors.errorBg }]}>
        <Feather name="wifi-off" size={26} color={colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{message}</Text>
      {onRetry ? <Button title="Try again" icon="refresh-cw" onPress={onRetry} loading={retrying} style={styles.action} /> : null}
      {secondaryActions.map((a) => (
        <Button key={a.title} title={a.title} variant="ghost" onPress={a.onPress} style={styles.secondary} />
      ))}
    </View>
  );
}

interface EmptyProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message?: string;
  action?: { title: string; onPress: () => void };
}

export function EmptyView({ icon = 'inbox', title, message, action }: EmptyProps) {
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <Feather name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.body}>{message}</Text> : null}
      {action ? <Button title={action.title} variant="secondary" onPress={action.onPress} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, minHeight: 280 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.tealMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, textAlign: 'center', marginBottom: space.sm },
  body: { ...type.subtitle, textAlign: 'center' },
  loadingText: { marginTop: space.md },
  action: { marginTop: space.lg, alignSelf: 'stretch' },
  secondary: { marginTop: space.sm, alignSelf: 'stretch' },
});
