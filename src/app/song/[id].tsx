import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { C } from '@/constants/colors';
import { useAppState } from '@/state/app-state';

// 曲ページ。中身は後の区切りで作る
export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useAppState();
  const song = data.songs.find((s) => s.id === id);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>{song?.title ?? '曲が見つかりません'}</Text>
      {!!song?.sub && <Text style={styles.sub}>{song.sub}</Text>}
      <Text style={styles.note}>曲ページは後の区切りで作ります。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.card },
  title: { fontSize: 28, fontWeight: '700', color: C.fg },
  sub: { marginTop: 2, fontSize: 15, color: C.muted },
  note: { marginTop: 12, fontSize: 15, color: C.muted },
});
