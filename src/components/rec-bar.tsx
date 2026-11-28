import { router } from 'expo-router';
import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/colors';
import { fmtDate } from '@/lib/date';
import { useLoadedState } from '@/state/app-state';
import { fmtDur, useRecorder } from '@/state/recorder';

// 録音中の赤い帯。録っている間は、どの画面でもいちばん下に出す（レッスンでも個人練でも）。
// 押すと録音の画面、右の停止で完了（保存）する。一時停止中はそう出す。
// 帯のぶん、下の画面（タブや録音ボタン）が帯の上に乗るように、下の余白（セーフエリア）を 0 にして渡す。
// 全画面の録音・再生の画面やシートは帯の上に重なるので、本当の余白を useScreenInsets で取る

const RealInsets = createContext<EdgeInsets | null>(null);

/** 帯に左右されない、本当のセーフエリア。帯の上に重なる画面（録音・再生の画面、シート）で使う */
export function useScreenInsets() {
  const real = useContext(RealInsets);
  const insets = useSafeAreaInsets();
  return real ?? insets;
}

export function WithRecBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const rec = useRecorder();
  const on = !!rec.target;
  return (
    <RealInsets.Provider value={insets}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <SafeAreaInsetsContext.Provider value={on ? { ...insets, bottom: 0 } : insets}>
          <View style={{ flex: 1 }}>{children}</View>
        </SafeAreaInsetsContext.Provider>
        {on && <RecBar bottom={insets.bottom} />}
      </View>
    </RealInsets.Provider>
  );
}

function RecBar({ bottom }: { bottom: number }) {
  const { data } = useLoadedState();
  const rec = useRecorder();
  const t = rec.target;
  if (!t) return null;
  const lesson = t.lessonId ? data.lessons.find((l) => l.id === t.lessonId) : undefined;
  const song = t.songId ? data.songs.find((s) => s.id === t.songId) : undefined;
  const linked = !t.fromSong || t.linkLesson !== false;
  const what =
    t.kind === 'lesson'
      ? lesson
        ? `${fmtDate(lesson.date)}のレッスン`
        : 'レッスン'
      : t.kind === 'practice' && linked
        ? `個人練・${song ? song.title : '曲なし'}`
        : (song?.title ?? '録音');
  return (
    <Pressable onPress={() => router.push('/recording')} style={[styles.bar, { paddingBottom: Math.max(bottom, 10) + 4 }]} accessibilityLabel="録音の画面を開く">
      <View style={[styles.dot, rec.paused && { opacity: 0.5 }]} />
      <Text style={styles.time}>{rec.paused ? `一時停止中 ${fmtDur(rec.elapsed)}` : fmtDur(rec.elapsed)}</Text>
      <Text style={styles.what} numberOfLines={1}>
        {what}
      </Text>
      <Pressable onPress={() => rec.stop()} style={styles.stop} hitSlop={8} accessibilityRole="button" accessibilityLabel="録音を止めて保存する">
        <View style={styles.stopSq} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, paddingHorizontal: 20, backgroundColor: C.rec },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  time: { color: '#fff', fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  what: { flex: 1, color: '#fff', fontSize: 15 },
  stop: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stopSq: { width: 12, height: 12, borderRadius: 2, backgroundColor: C.rec },
});
