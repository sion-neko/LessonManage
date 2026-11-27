import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FolderHeader } from '@/components/folder-header';
import { Icon } from '@/components/icon';
import { Blank, GoButton } from '@/components/ui';
import { C } from '@/constants/colors';
import type { Line, Topic } from '@/data/types';
import { fmtDate } from '@/lib/date';
import { lessonsOf, topicLabel, useAppState } from '@/state/app-state';

// いま：選んでいるフォルダの直近のレッスンを1画面で
export default function HomeScreen() {
  const { data, folder } = useAppState();
  const lesson = lessonsOf(data, folder?.id)[0];
  const recordPractice = () => Alert.alert('個人練を録音', '録音は後の区切りで作ります。');

  if (!lesson) {
    return (
      <View style={styles.screen}>
        <FolderHeader />
        <ScrollView>
          <Blank title={`${folder?.name ?? ''}のレッスンはまだありません`} body="レッスンの日に作ると、学んだこととやることがここに出ます。">
            <GoButton label="最初のレッスン" icon="plus" onPress={() => Alert.alert('最初のレッスン', 'レッスンの作成は後の区切りで作ります。')} />
          </Blank>
        </ScrollView>
      </View>
    );
  }

  // 学んだことをトピックごとに（トピックなしの行を先頭に）
  const groups: { topic: Topic | null; lines: Line[] }[] = [null, ...lesson.topics]
    .map((t) => ({ topic: t, lines: lesson.learned.filter((n) => n.topicKey === (t ? t.key : null)) }))
    .filter((g) => g.lines.length > 0);

  return (
    <View style={styles.screen}>
      <FolderHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.hero}>
          <View style={styles.cap}>
            <Text style={styles.capText}>{fmtDate(lesson.date)}</Text>
            <Pressable onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })} style={styles.capLink}>
              <Text style={[styles.capText, { fontWeight: '600' }]}>レッスンのページ</Text>
              <Icon name="chevron" size={12} color={C.heroCap} />
            </Pressable>
          </View>
          <Text style={styles.heroTitle}>やること</Text>
          {lesson.homework.map((h) => (
            <View key={h.id} style={styles.hwRow}>
              <View style={styles.hwDot} />
              <Text style={styles.hwText}>{h.text}</Text>
            </View>
          ))}
        </View>
        <View style={styles.groups}>
          {groups.map((g) => (
            <View key={g.topic?.key ?? 'none'} style={styles.group}>
              {g.topic && <Text style={styles.groupTitle}>{topicLabel(data, g.topic)}</Text>}
              {g.lines.map((n) => (
                <View key={n.id} style={styles.lrRow}>
                  <View style={styles.lrBar} />
                  <Text style={styles.lrText}>{n.text}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.dock}>
        <GoButton label="個人練を録音" icon="mic" onPress={recordPractice} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  hero: { marginTop: 12, marginHorizontal: 16, borderRadius: 18, backgroundColor: C.heroBg, padding: 18 },
  cap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  capText: { fontSize: 13, color: C.heroCap },
  capLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  heroTitle: { marginTop: 4, marginBottom: 6, fontSize: 22, fontWeight: '800', color: C.fg },
  hwRow: { flexDirection: 'row', paddingVertical: 5 },
  hwDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, marginTop: 10, marginLeft: 2, marginRight: 8 },
  hwText: { flex: 1, fontSize: 17, fontWeight: '600', lineHeight: 25, color: C.fg },
  groups: { marginTop: 14, marginHorizontal: 16, gap: 10 },
  group: { backgroundColor: C.card, borderRadius: 14, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 8 },
  groupTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4, color: C.fg },
  lrRow: { flexDirection: 'row', paddingVertical: 5, gap: 9 },
  lrBar: { width: 3, borderRadius: 2, backgroundColor: C.bullet, marginVertical: 3 },
  lrText: { flex: 1, fontSize: 15, lineHeight: 22, color: C.fg },
  dock: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: C.bg },
});
