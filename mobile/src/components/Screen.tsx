import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View, type RefreshControlProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space } from '@/theme/tokens';

interface Props {
  children: ReactNode;
  /** Pinned to the bottom (e.g. the main call to action), above the keyboard. */
  footer?: ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

/** Standard page: safe area, keyboard avoidance, scrolling content and an optional bottom bar. */
export function Screen({ children, footer, refreshControl }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Android draws edge-to-edge (targetSdk 36), so the window no longer resizes for the keyboard:
          pad by the keyboard's height on both platforms to keep the focused field and footer visible. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.column, styles.content]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
        {footer ? <View style={[styles.column, styles.footer]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  // Phones use the full width; tablets get a centred column instead of stretched fields.
  column: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  content: { flexGrow: 1, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.lg },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md, backgroundColor: colors.background },
});
