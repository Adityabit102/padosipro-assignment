import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Task } from '@/api/types';
import { colors, fonts, radius, space, type } from '@/theme/tokens';

interface Props {
  task: Task;
  selected: boolean;
  onToggle: (id: string) => void;
}

export const TaskRow = memo(function TaskRow({ task, selected, onToggle }: Props) {
  return (
    <Pressable
      onPress={() => onToggle(task.id)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={task.name}
      accessibilityHint={task.description}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.name}>{task.name}</Text>
        <Text style={styles.description}>{task.description}</Text>
      </View>
      <View style={[styles.check, selected && styles.checkOn]}>
        {selected ? <Feather name="check" size={16} color={colors.white} /> : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.sm,
    minHeight: 64,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.tealMuted },
  pressed: { opacity: 0.85 },
  text: { flex: 1, marginRight: space.md },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginBottom: 2 },
  description: type.small,
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
