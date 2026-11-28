import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { LsHeading, NoneYet } from '@/components/lesson-parts';
import { FoldButton, MemoDays } from '@/components/memo-days';
import { RecordDock } from '@/components/play-bar';
import { RecList } from '@/components/rec-list';
import { Segment } from '@/components/segment';
import { C } from '@/constants/colors';
import * as repo from '@/db/repo';
import type { Lesson, Line } from '@/data/types';
import { fmtDate, fmtDateLong, todayYmd } from '@/lib/date';
import { lessonsOf, useLoadedState } from '@/state/app-state';
import { recTitle, usePlayer } from '@/state/player';
import { fmtDur, useRecorder } from '@/state/recorder';

const FOLD = 3;

// 曲ページ（docs/requirements.md「曲ページ」）。見た目はレッスンページに合わせる。
// 曲名の下で「まとめ／録音」を切り替える。開くたびに「まとめ」から
export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, act } = useLoadedState();
  const insets = useSafeAreaInsets();
  const rec = useRecorder();
  const player = usePlayer();
  const [view, setView] = useState<'sum' | 'rec'>('sum');
  const [learnedOpen, setLearnedOpen] = useState(false);
  const song = data.songs.find((s) => s.id === id);
  if (!song) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: '' }} />
        <Text style={[styles.title, { padding: 20 }]}>曲が見つかりません</Text>
      </View>
    );
  }

  // この曲をトピックにしたレッスン（新しい順）と、その曲のトピックの下に書いた行
  const lessons = lessonsOf(data, song.folderId).filter((l) => l.topics.some((t) => t.kind === 'song' && t.songId === song.id));
  const learnedDays: { lesson: Lesson; lines: Line[] }[] = lessons
    .map((l) => {
      const keys = l.topics.filter((t) => t.kind === 'song' && t.songId === song.id).map((t) => t.key);
      return { lesson: l, lines: l.learned.filter((n) => n.topicKey !== null && keys.includes(n.topicKey)) };
    })
    .filter((d) => d.lines.length > 0);
  const shownDays = learnedOpen ? learnedDays : learnedDays.slice(0, FOLD);
  const memos = data.memos.filter((m) => m.songId === song.id);
  const recs = data.recordings.filter((r) => r.songId === song.id);
  const lessonRecOf = (lessonId: string) => data.recordings.find((r) => r.kind === 'lesson' && r.lessonId === lessonId);

  // この曲を録音：録る前の録音の画面を開く。既定でそのフォルダの直近のレッスン後の個人練になる（録音の画面で外せる）
  const recordSong = () => {
    if (rec.target) Alert.alert('録音中です', 'ほかの録音を止めてから');
    else router.push({ pathname: '/recording', params: { songId: song.id } });
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{song.title}</Text>
        {!!song.sub && <Text style={styles.sub}>{song.sub}</Text>}
        <View style={styles.segWrap}>
          <Segment
            items={[
              ['sum', 'まとめ'],
              ['rec', '録音'],
            ]}
            value={view}
            onChange={setView}
          />
        </View>

        {view === 'sum' ? (
          <>
            <LsHeading>レッスンで学んだこと</LsHeading>
            {learnedDays.length === 0 && <NoneYet />}
            {shownDays.map(({ lesson, lines }) => {
              const lr = lessonRecOf(lesson.id);
              return (
                <View key={lesson.id}>
                  <Text style={styles.day}>{fmtDate(lesson.date)}</Text>
                  {lines.map((n) => (
                    <View key={n.id} style={styles.row}>
                      <View style={styles.dotBox}>
                        <View style={styles.dot} />
                      </View>
                      <Text style={styles.text}>{n.text}</Text>
                      {n.at != null &&
                        (lr ? (
                          <Pressable onPress={() => player.play(lr, n.at)} hitSlop={8} accessibilityLabel={`${fmtDur(n.at)}から再生`}>
                            <Text style={styles.at}>▶{fmtDur(n.at)}</Text>
                          </Pressable>
                        ) : (
                          <Text style={[styles.at, { color: C.muted }]}>{fmtDur(n.at)}</Text>
                        ))}
                    </View>
                  ))}
                </View>
              );
            })}
            {learnedDays.length > FOLD && <FoldButton open={learnedOpen} rest={learnedDays.length - FOLD} onPress={() => setLearnedOpen(!learnedOpen)} />}

            <LsHeading>自分のメモ</LsHeading>
            <MemoDays
              memos={memos}
              foldAfter={FOLD}
              onAdd={(text) => act((db) => repo.addMemo(db, { folderId: song.folderId, lessonId: null, songId: song.id, date: todayYmd(), text }))}
              onEdit={(mid, text) => act((db) => repo.updateMemo(db, mid, text))}
              onDelete={(mid) => act((db) => repo.deleteMemo(db, mid))}
            />

            <LsHeading>扱ったレッスン</LsHeading>
            {lessons.length === 0 && <NoneYet />}
            {lessons.map((l, i) => (
              <Pressable
                key={l.id}
                onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: l.id } })}
                style={({ pressed }) => [styles.link, i > 0 && styles.border, pressed && { backgroundColor: C.hl }]}>
                <Text style={styles.linkText}>{fmtDateLong(l.date)}</Text>
                <Icon name="chevron" size={14} color={C.chevron} />
              </Pressable>
            ))}
          </>
        ) : (
          <View style={{ marginTop: 14 }}>
            <RecList
              recs={recs}
              sub={(r) => ({ label: r.kind === 'practice' ? recTitle(data, r) : '曲の録音' })}
            />
          </View>
        )}
      </ScrollView>
      {view === 'rec' ? (
        <RecordDock label="この曲を録音" onRecord={recordSong} shrink bottom={Math.max(insets.bottom, 16) + 8} />
      ) : (
        <RecordDock bottom={Math.max(insets.bottom, 16) + 8} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.card },
  title: { paddingHorizontal: 20, fontSize: 28, fontWeight: '700', lineHeight: 35, color: C.fg },
  sub: { paddingHorizontal: 20, marginTop: 2, fontSize: 15, color: C.muted },
  segWrap: { paddingTop: 14, paddingHorizontal: 20 },
  day: { paddingTop: 10, paddingHorizontal: 20, fontSize: 13, fontWeight: '700', color: '#48484a' },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5, paddingHorizontal: 20 },
  dotBox: { width: 20, height: 25, marginLeft: -7, marginRight: 4, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#aeaeb2' },
  text: { flex: 1, fontSize: 16, lineHeight: 25, color: C.fg },
  at: { marginLeft: 6, fontSize: 12, lineHeight: 25, fontWeight: '600', color: C.accent, fontVariant: ['tabular-nums'] },
  link: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  linkText: { flex: 1, fontSize: 16, color: C.fg },
});
