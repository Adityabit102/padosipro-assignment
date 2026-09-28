import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, space } from '@/theme/tokens';

type Tone = 'error' | 'success' | 'info' | 'warning';

const tones: Record<Tone, { bg: string; fg: string; icon: keyof typeof Feather.glyphMap }> = {
  error: { bg: colors.errorBg, fg: colors.error, icon: 'alert-circle' },
  success: { bg: colors.successBg, fg: colors.success, icon: 'check-circle' },
  info: { bg: colors.tealMuted, fg: colors.primaryDeep, icon: 'info' },
  warning: { bg: colors.warningBg, fg: colors.warning, icon: 'alert-triangle' },
};

export function Banner({ tone, message }: { tone: Tone; message: string }) {
  const t = tones[tone];
  return (
    <View
      style={[styles.container, { backgroundColor: t.bg }]}
      accessibilityRole={tone === 'error' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
    >
      <Feather name={t.icon} size={18} color={t.fg} style={styles.icon} />
      <Text style={[styles.text, { color: t.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
  },
  icon: { marginRight: space.sm, marginTop: 1 },
  text: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
});
