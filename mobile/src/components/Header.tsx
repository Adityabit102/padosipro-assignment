import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from '@/theme/tokens';
import { BrandMark } from './BrandMark';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Shows a back arrow instead of the brand mark. */
  back?: boolean;
  onBack?: () => void;
  /** Hide the brand mark to save height on list-heavy screens. */
  brand?: boolean;
}

export function Header({ eyebrow = 'PadosiPro', title, subtitle, back, onBack, brand = true }: Props) {
  return (
    <View style={styles.container}>
      {back ? (
        <Pressable
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/login')))}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          style={styles.back}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
      ) : brand ? (
        <BrandMark />
      ) : null}
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: space.lg },
  back: { width: 48, height: 48, justifyContent: 'center', marginLeft: -4, marginBottom: space.sm },
  eyebrow: { ...type.eyebrow, marginBottom: space.sm },
  title: { ...type.title, marginBottom: space.sm },
  subtitle: type.subtitle,
});
