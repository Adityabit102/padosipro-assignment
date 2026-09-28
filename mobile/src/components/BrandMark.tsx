import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, space } from '@/theme/tokens';

/** A simple monogram for this project (deliberately not PadosiPro's real logo). */
export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <View
      style={[styles.box, { width: size, height: size, borderRadius: size / 4 }]}
      accessibilityRole="image"
      accessibilityLabel="PadosiPro"
    >
      <Text style={[styles.letter, { fontSize: size * 0.5 }]}>P</Text>
      <View style={[styles.dot, { width: size * 0.14, height: size * 0.14, right: size * 0.2, bottom: size * 0.22 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  letter: { fontFamily: fonts.bold, color: colors.white, includeFontPadding: false },
  dot: { position: 'absolute', backgroundColor: colors.tealSoft, borderRadius: radius.pill },
});
