import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { C } from '@/constants/colors';
import { fmtDateLong } from '@/lib/date';
import { useLoadedState } from '@/state/app-state';

// レッスンページ。中身は後の区切りで作る
export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useLoadedState();
  const lesson = data.lessons.find((l) => l.id === id);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ title: '' }} />
      <Text style={styles.title}>{lesson ? fmtDateLong(lesson.date) : 'レッスンが見つかりません'}</Text>
      <Text style={styles.note}>レッスンページは後の区切りで作ります。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.card },
  title: { fontSize: 28, fontWeight: '700', color: C.fg },
  note: { marginTop: 12, fontSize: 15, color: C.muted },
});
