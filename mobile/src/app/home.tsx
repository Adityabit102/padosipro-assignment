import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { colors, fonts, radius, space, type } from '@/theme/tokens';
import { formatMobile } from '@/utils/validation';

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { account, signOut } = useAuth();
  const tasks = useQuery({ queryKey: ['myTasks'], queryFn: api.myTasks });
  const firstName = account?.profile?.name.split(' ')[0] ?? 'there';
  const total = tasks.data?.reduce((n, c) => n + c.tasks.length, 0) ?? 0;

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You will need to log in again to see your tasks.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);

  const renderTasks = () => {
    if (tasks.isPending) return <LoadingView label="Loading your tasks…" />;
    if (tasks.error) {
      return (
        <ErrorView
          title="Couldn't load your tasks"
          message={errorMessage(tasks.error)}
          onRetry={() => void tasks.refetch()}
          retrying={tasks.isFetching}
        />
      );
    }
    if (total === 0) {
      return (
        <EmptyView
          icon="check-square"
          title="No tasks selected yet"
          message="Choose what you'd like handled and your Lifestyle Manager will take it from there."
          action={{ title: 'Choose tasks', onPress: () => router.push('/tasks') }}
        />
      );
    }
    return tasks.data.map((category) => (
      <View key={category.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Feather
              name={(category.icon in Feather.glyphMap ? category.icon : 'grid') as keyof typeof Feather.glyphMap}
              size={16}
              color={colors.primary}
            />
          </View>
          <Text style={styles.cardTitle}>{category.name}</Text>
          <Text style={styles.cardCount}>{category.tasks.length}</Text>
        </View>
        {category.tasks.map((t, i) => (
          <View key={t.id} style={[styles.task, i > 0 && styles.taskDivider]}>
            <Text style={styles.taskName}>{t.name}</Text>
            <Text style={type.small}>{t.description}</Text>
          </View>
        ))}
      </View>
    ));
  };

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={tasks.isRefetching}
          onRefresh={() => void tasks.refetch()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      footer={
        total > 0 ? <Button title="Edit tasks" icon="edit-2" variant="secondary" onPress={() => router.push('/tasks')} /> : null
      }
    >
      <View style={styles.topBar}>
        <BrandMark size={40} />
        <Pressable
          onPress={confirmLogout}
          style={styles.logout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          hitSlop={8}
        >
          <Feather name="log-out" size={18} color={colors.textMutedDeep} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      <Text style={styles.eyebrow}>{greeting()}</Text>
      <Text style={styles.title} accessibilityRole="header">
        Hi {firstName}, we’ve got this.
      </Text>
      <Text style={[type.subtitle, styles.subtitle]}>You don’t manage tasks — we do.</Text>

      <View style={styles.lmCard}>
        <Text style={styles.lmLabel}>Lifestyle Manager</Text>
        <Text style={styles.lmTitle}>Your Lifestyle Manager will be in touch soon</Text>
        {account?.profile ? (
          <Text style={styles.lmText}>We’ll call you on {formatMobile(account.profile.mobile)} to get started.</Text>
        ) : null}
        <Text style={styles.gold}>Dedicated support • Calm updates</Text>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Your tasks</Text>
        {total > 0 ? <Text style={styles.sectionMeta}>{total} selected</Text> : null}
      </View>
      {renderTasks()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  logoutText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMutedDeep },
  eyebrow: { ...type.eyebrow, marginTop: space.sm, marginBottom: space.sm },
  title: { ...type.title, marginBottom: space.sm },
  subtitle: { marginBottom: space.lg },
  lmCard: {
    backgroundColor: colors.primaryDeep,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.lg,
  },
  lmLabel: { ...type.eyebrow, color: colors.tealSoft, marginBottom: space.sm },
  lmTitle: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.white, marginBottom: space.xs },
  lmText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: '#D1E7E0', marginBottom: space.sm },
  gold: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.md },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  sectionMeta: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  cardIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.tealMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.sm,
  },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, flex: 1 },
  cardCount: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.tealMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  task: { paddingVertical: space.sm },
  taskDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  taskName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginBottom: 2 },
});
