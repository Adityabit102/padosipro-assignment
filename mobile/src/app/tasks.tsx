import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import type { Category, Task } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { TaskRow } from '@/components/TaskRow';
import { colors, fonts, radius, space, type } from '@/theme/tokens';
import { matchesSearch } from '@/utils/search';

type Section = { category: Category; data: Task[] };


export default function TasksScreen() {
  const { account, setAccount } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = account?.hasSelectedTasks ?? false;

  const catalogue = useQuery({ queryKey: ['catalogue'], queryFn: api.catalogue });
  // When editing, start from what the user already picked.
  const mine = useQuery({ queryKey: ['myTasks'], queryFn: api.myTasks, enabled: isEditing });

  // The saved selection is the starting point; `picked` holds the user's changes once they touch anything.
  const initial = useMemo(
    () => new Set(isEditing ? (mine.data ?? []).flatMap((c) => c.tasks.map((t) => t.id)) : []),
    [isEditing, mine.data],
  );
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const selected = picked ?? initial;

  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState(false);

  const toggle = useCallback(
    (id: string) => {
      setPicked((prev) => {
        const next = new Set(prev ?? initial);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [initial],
  );

  const sections = useMemo<Section[]>(() => {
    return (catalogue.data ?? [])
      .map((category) => ({
        category,
        data: category.tasks.filter((t) => matchesSearch(query, [t.name, t.description, category.name])),
      }))
      .filter((s) => s.data.length > 0);
  }, [catalogue.data, query]);

  const selectedByCategory = useMemo(
    () =>
      (catalogue.data ?? [])
        .map((c) => ({ ...c, tasks: c.tasks.filter((t) => selected.has(t.id)) }))
        .filter((c) => c.tasks.length > 0),
    [catalogue.data, selected],
  );

  const save = useMutation({
    mutationFn: () => api.saveMyTasks([...selected]),
    onSuccess: (categories) => {
      queryClient.setQueryData(['myTasks'], categories);
      setConfirming(false);
      if (account) setAccount({ ...account, hasSelectedTasks: true });
      // Editing was opened from Home, so go back to it; first-time selection moves on to Home.
      if (isEditing && router.canGoBack()) router.back();
      else router.replace('/home');
    },
  });

  if (catalogue.isPending || (isEditing && mine.isPending)) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingView label="Loading tasks…" />
      </SafeAreaView>
    );
  }

  const loadError = catalogue.error ?? (isEditing ? mine.error : null);
  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorView
          title="Couldn't load tasks"
          message={errorMessage(loadError)}
          retrying={catalogue.isFetching || mine.isFetching}
          onRetry={() => {
            void catalogue.refetch();
            if (isEditing) void mine.refetch();
          }}
          secondaryActions={isEditing ? [{ title: 'Back to home', onPress: () => router.back() }] : []}
        />
      </SafeAreaView>
    );
  }

  const count = selected.size;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {isEditing ? (
        // Pinned, so the way back stays visible after the header scrolls away.
        <View style={styles.topBar}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={22} color={colors.text} />
          </Pressable>
        </View>
      ) : null}
      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => <TaskRow task={item} selected={selected.has(item.id)} onToggle={toggle} />}
        renderSectionHeader={({ section }) => <SectionHeader section={section} selected={selected} />}
        ListHeaderComponent={
          <View style={styles.top}>
            <Header
              brand={false}
              eyebrow={isEditing ? 'Edit tasks' : 'Step 2 of 2 · Tasks'}
              title="What would you like handled?"
              subtitle="Pick everything you’d like your Lifestyle Manager to take care of."
            />
            <View style={styles.search}>
              <Feather name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search tasks"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Search tasks"
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Clear search">
                  <Feather name="x-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query ? (
            <EmptyView
              icon="search"
              title={`No tasks match "${query.trim()}"`}
              message="Try a different word, like cleaning, travel or doctor."
              action={{ title: 'Clear search', onPress: () => setQuery('') }}
            />
          ) : (
            <EmptyView icon="inbox" title="No tasks available yet" message="Please check back soon." />
          )
        }
      />

      <View style={styles.footer}>
        <View style={styles.footerInner}>
          {count > 0 ? (
            <Pressable onPress={() => setPicked(new Set())} hitSlop={8} accessibilityRole="button" style={styles.clear}>
              <Text style={styles.clearText}>Clear selection</Text>
            </Pressable>
          ) : null}
          <Button
            title={count === 0 ? 'Select at least one task' : `Continue · ${count} selected`}
            onPress={() => {
              save.reset();
              setConfirming(true);
            }}
            disabled={count === 0}
          />
        </View>
      </View>

      <ConfirmSheet
        visible={confirming}
        categories={selectedByCategory}
        count={count}
        saving={save.isPending}
        error={save.error ? errorMessage(save.error) : null}
        onConfirm={() => save.mutate()}
        onClose={() => !save.isPending && setConfirming(false)}
      />
    </SafeAreaView>
  );
}

function SectionHeader({ section, selected }: { section: Section; selected: Set<string> }) {
  const picked = section.category.tasks.filter((t) => selected.has(t.id)).length;
  const icon = (section.category.icon in Feather.glyphMap ? section.category.icon : 'grid') as keyof typeof Feather.glyphMap;
  return (
    <View style={styles.sectionHeader} accessibilityRole="header">
      <View style={styles.sectionIcon}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={styles.sectionTitle}>{section.category.name}</Text>
      {picked > 0 ? <Text style={styles.sectionCount}>{picked} selected</Text> : null}
    </View>
  );
}

interface ConfirmProps {
  visible: boolean;
  categories: Category[];
  count: number;
  saving: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmSheet({ visible, categories, count, saving, error, onConfirm, onClose }: ConfirmProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle} accessibilityRole="header">
            Confirm your tasks
          </Text>
          <Text style={[type.subtitle, styles.sheetSubtitle]}>
            Your Lifestyle Manager will handle these {count} {count === 1 ? 'task' : 'tasks'}. You can change them later.
          </Text>
          <ScrollView style={styles.sheetList}>
            {categories.map((c) => (
              <View key={c.id} style={styles.sheetGroup}>
                <Text style={styles.sheetCategory}>{c.name}</Text>
                {c.tasks.map((t) => (
                  <View key={t.id} style={styles.sheetItem}>
                    <Feather name="check" size={16} color={colors.primary} />
                    <Text style={styles.sheetItemText}>{t.name}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          {error ? <Banner tone="error" message={error} /> : null}
          <Button title={error ? 'Try again' : 'Confirm and save'} onPress={onConfirm} loading={saving} />
          <Button title="Edit selection" variant="ghost" onPress={onClose} disabled={saving} style={styles.sheetSecondary} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  // The header scrolls with the list so small screens keep room for the tasks.
  top: { paddingTop: space.lg },
  topBar: { paddingHorizontal: space.lg, paddingTop: space.sm, width: '100%', maxWidth: 600, alignSelf: 'center' },
  backButton: { width: 48, height: 48, justifyContent: 'center', marginLeft: -4 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 48,
    marginBottom: space.sm,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text, paddingVertical: 10 },
  list: { paddingHorizontal: space.lg, paddingBottom: space.lg, flexGrow: 1, width: '100%', maxWidth: 600, alignSelf: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.tealMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.sm,
  },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, flex: 1 },
  sectionCount: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  footerInner: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  clear: { alignSelf: 'center', paddingVertical: space.sm, marginBottom: space.xs },
  clearText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,24,40,0.44)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: space.md,
  },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, marginBottom: space.xs },
  sheetSubtitle: { marginBottom: space.md },
  sheetList: { flexGrow: 0, marginBottom: space.md },
  sheetGroup: { marginBottom: space.md },
  sheetCategory: { ...type.eyebrow, marginBottom: space.xs },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6 },
  sheetItemText: { ...type.body, flex: 1 },
  sheetSecondary: { marginTop: space.xs },
});
