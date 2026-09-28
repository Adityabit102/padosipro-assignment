import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, radius, space } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style, accessibilityHint }: Props) {
  const inactive = disabled || loading;
  const v = variants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        v.container,
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <View style={styles.row}>
          {icon ? <Feather name={icon} size={18} color={v.text.color} style={styles.icon} /> : null}
          <Text style={[styles.text, v.text]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: space.sm },
  text: { fontFamily: fonts.bold, fontSize: 16 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
});

const variants: Record<Variant, { container: ViewStyle; text: { color: string } }> = {
  primary: { container: { backgroundColor: colors.primary }, text: { color: colors.white } },
  secondary: {
    container: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
    text: { color: colors.primary },
  },
  ghost: { container: { backgroundColor: 'transparent', minHeight: 48 }, text: { color: colors.primary } },
  danger: {
    container: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.errorBg },
    text: { color: colors.error },
  },
};
