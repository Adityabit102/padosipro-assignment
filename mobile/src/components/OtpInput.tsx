import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius, space } from '@/theme/tokens';

const LENGTH = 6;

interface Props {
  value: string;
  onChange: (digits: string) => void;
  /** Called once all 6 digits are entered. */
  onComplete?: (code: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export interface OtpInputHandle {
  focus: () => void;
}

/**
 * Six boxes backed by one hidden TextInput, so paste, keyboard autofill and
 * backspace all work without juggling focus between six inputs.
 */
export const OtpInput = forwardRef<OtpInputHandle, Props>(function OtpInput(
  { value, onChange, onComplete, error, disabled },
  ref,
) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, LENGTH);
    onChange(digits);
    if (digits.length === LENGTH) onComplete?.(digits);
  };

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      style={styles.row}
      accessible={false}
      disabled={disabled}
    >
      {Array.from({ length: LENGTH }, (_, i) => {
        const char = value[i] ?? '';
        const active = focused && !disabled && i === Math.min(value.length, LENGTH - 1);
        return (
          <View
            key={i}
            style={[
              styles.box,
              char ? styles.boxFilled : null,
              active ? styles.boxActive : null,
              error ? styles.boxError : null,
            ]}
          >
            <Text style={styles.char}>{char}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={!disabled}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={LENGTH}
        caretHidden
        autoFocus
        style={styles.hiddenInput}
        accessibilityLabel="6-digit verification code"
        accessibilityValue={{ text: value ? `${value.length} of 6 digits entered` : 'empty' }}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, marginBottom: space.md },
  box: {
    flex: 1,
    maxWidth: 56,
    aspectRatio: 0.85,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: colors.textMuted },
  boxActive: { borderColor: colors.primary, borderWidth: 2 },
  boxError: { borderColor: colors.error, backgroundColor: colors.errorBg },
  char: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
  // Covers the boxes so taps and long-press paste land on the real input.
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.011, color: 'transparent' },
});
