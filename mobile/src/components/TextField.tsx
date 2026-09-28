import { Feather } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radius, space, type } from '@/theme/tokens';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  /** Fixed text before the input, e.g. "+91". */
  prefix?: string;
  error?: string | null;
  hint?: string;
  optional?: boolean;
  /** Adds a show/hide toggle for passwords. */
  secureToggle?: boolean;
}

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, icon, prefix, error, hint, optional, secureToggle, multiline, onFocus, onBlur, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? colors.error : focused ? colors.primary : colors.border;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> (optional)</Text> : null}
      </Text>
      <View style={[styles.field, multiline && styles.fieldMultiline, { borderColor }]}>
        {icon ? (
          <Feather name={icon} size={16} color={colors.textMuted} style={[styles.icon, multiline && styles.iconTop]} />
        ) : null}
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureToggle ? hidden : inputProps.secureTextEntry}
          multiline={multiline}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={styles.toggle}
          >
            <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.messageRow} accessibilityLiveRegion="polite">
          <Feather name="alert-circle" size={13} color={colors.error} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { marginBottom: space.md },
  label: { ...type.label, marginBottom: space.sm },
  optional: { fontFamily: fonts.regular, color: colors.textMuted },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    minHeight: 56,
  },
  fieldMultiline: { alignItems: 'flex-start', minHeight: 96 },
  icon: { marginRight: space.md },
  iconTop: { marginTop: 18 },
  prefix: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, marginRight: space.sm },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text, paddingVertical: 14 },
  inputMultiline: { minHeight: 92, textAlignVertical: 'top' },
  toggle: { paddingLeft: space.sm, minHeight: 44, justifyContent: 'center' },
  messageRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.error, flexShrink: 1 },
  hint: { ...type.small, marginTop: 6 },
});
