import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getApiUrl } from '@/api/config';
import { colors, fonts, radius, space } from '@/theme/tokens';

/**
 * Shown when the API can't be reached. Names the address the app tried and links
 * straight to the Server setting, which is the fix on a real phone.
 */
export function ServerErrorBanner({ onDismiss }: { onDismiss: () => void }) {
  const host = getApiUrl().replace(/^https?:\/\//, '');
  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Feather name="wifi-off" size={18} color={colors.error} style={styles.icon} />
      <View style={styles.body}>
        <Text style={styles.title}>Can’t reach the server at {host}</Text>
        <Text style={styles.text}>
          On a phone, set your computer’s Wi-Fi address (for example 192.168.1.20:4000). The emulator works with
          10.0.2.2:4000.
        </Text>
        <Pressable
          onPress={() => {
            onDismiss(); // the error is stale once the user goes to fix the address
            router.push('/server');
          }}
          accessibilityRole="button"
          accessibilityLabel="Change server"
          hitSlop={8}
          style={styles.action}
        >
          <Text style={styles.actionText}>Change server</Text>
          <Feather name="chevron-right" size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
  },
  icon: { marginRight: space.sm, marginTop: 1 },
  body: { flex: 1 },
  title: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.error },
  text: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMutedDeep, marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: space.sm, minHeight: 32 },
  actionText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
});
