import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dock, LsHeading, TopicHeading } from '@/components/lesson-parts';
import { Icon } from '@/components/icon';
import { LineList } from '@/components/line-list';
import { MemoDays } from '@/components/memo-days';
import { PracticeStart } from '@/components/practice-start';
import { RecList } from '@/components/rec-list';
import { Segment } from '@/components/segment';
import { TopicPicker } from '@/components/topic-picker';
import { TopicSheet } from '@/components/topic-sheet';
import { TopicTags } from '@/components/topic-tags';
import { GoButton } from '@/components/ui';
import { C } from '@/constants/colors';
import * as repo from '@/db/repo';
import type { Topic } from '@/data/types';
import { fmtDateLong, todayYmd } from '@/lib/date';
import { topicLabel, useLoadedState } from '@/state/app-state';
import { fmtDur, useRecorder } from '@/state/recorder';

type View_ = 'sum' | 'pr';

// レッスンページ（docs/requirements.md「レッスンページ」）。
// 白一色。上から 日付 → このレッスンのトピック → 「まとめ／個人練」の切り替え
export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, act } = useLoadedState();
  const insets = useSafeAreaInsets();
  const lesson = data.lessons.find((l) => l.id === id);
  // 開くたびに「まとめ」から
  const [view, setView] = useState<View_>('sum');
  const [picker, setPicker] = useState(false);
  const [editTopic, setEditTopic] = useState<Topic | null>(null);
  const [practice, setPractice] = useState(false);
  const rec = useRecorder();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const headingY = useRef<Record<string, number>>({});

  if (!lesson) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: '' }} />
        <Text style={[styles.date, { padding: 20 }]}>レッスンが見つかりません</Text>
      </View>
    );
  }

  const tags = lesson.topics.map((t) => ({ key: t.key, label: topicLabel(data, t) }));
  const goTopic = (key: string) => {
    const scrollTo = () => {
      const y = headingY.current[key];
      if (y != null) scroll.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
    };
    if (view === 'sum') scrollTo();
    else {
      setView('sum');
      setTimeout(scrollTo, 80);
    }
  };

  // 学んだことの並び：トピックの順、最後に「トピックなし」（その行があるとき、またはトピックがひとつもないとき）
  const groups: (Topic | null)[] = [...lesson.topics];
  if (lesson.learned.some((n) => n.topicKey === null) || lesson.topics.length === 0) groups.push(null);

  const lineActions = {
    onEdit: (lineId: string, text: string) => act((db) => repo.updateLine(db, lineId, text)),
    onDelete: (lineId: string) => act((db) => repo.deleteLine(db, lineId)),
  };
  const memos = data.memos.filter((m) => m.lessonId === lesson.id);
  // このレッスンを録音中か。録音中に書いた学んだことの行には、経過時間を付ける
  const recordingHere = rec.target?.kind === 'lesson' && rec.target.lessonId === lesson.id;
  const lessonRec = data.recordings.find((r) => r.kind === 'lesson' && r.lessonId === lesson.id);
  const practiceRecs = data.recordings.filter((r) => r.kind === 'practice' && r.lessonId === lesson.id);
  const busy = () => {
    if (!rec.target) return false;
    Alert.alert('録音中です', 'ほかの録音を止めてから');
    return true;
  };
  const recordLesson = async () => {
    if (busy()) return;
    if (await rec.start({ kind: 'lesson', folderId: lesson.folderId, lessonId: lesson.id, songId: null })) router.push('/recording');
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.date}>{fmtDateLong(lesson.date)}</Text>
        <TopicTags tags={tags} onTap={goTopic} onAdd={() => setPicker(true)} />
        <View style={styles.segWrap}>
          <Segment
            items={[
              ['sum', 'まとめ'],
              ['pr', '個人練'],
            ]}
            value={view}
            onChange={setView}
          />
        </View>

        {view === 'sum' ? (
          <>
            {lessonRec && (
              <View style={styles.player}>
                <Pressable onPress={() => Alert.alert('再生', '再生は次の区切りで作ります。')} style={styles.ppl} accessibilityLabel="再生">
                  <Icon name="play" size={18} color="#fff" />
                </Pressable>
                <Text style={styles.playerText}>レッスンの録音</Text>
                <Text style={styles.playerDur}>{fmtDur(lessonRec.duration)}</Text>
              </View>
            )}
            <LsHeading>やること</LsHeading>
            <LineList
              items={lesson.homework}
              variant="homework"
              onAdd={(text) => act((db) => repo.addLine(db, lesson.id, 'homework', null, text))}
              {...lineActions}
            />
            <LsHeading>学んだこと</LsHeading>
            {groups.map((t) => (
              <View
                key={t?.key ?? 'none'}
                onLayout={(e) => {
                  if (t) headingY.current[t.key] = e.nativeEvent.layout.y;
                }}>
                {(t || lesson.topics.length > 0) && (
                  <TopicHeading
                    label={t ? topicLabel(data, t) : 'トピックなし'}
                    song={t?.kind === 'song'}
                    onPress={t ? () => setEditTopic(t) : undefined}
                  />
                )}
                <LineList
                  items={lesson.learned.filter((n) => n.topicKey === (t ? t.key : null))}
                  variant="bullet"
                  onAdd={(text) =>
                    act((db) =>
                      recordingHere
                        ? repo.addLineAt(db, lesson.id, t ? t.key : null, text, Math.floor(rec.elapsed))
                        : repo.addLine(db, lesson.id, 'learned', t ? t.key : null, text),
                    )
                  }
                  atStyle={recordingHere ? 'live' : 'saved'}
                  {...lineActions}
                />
              </View>
            ))}
          </>
        ) : (
          <>
            <LsHeading>メモ</LsHeading>
            <MemoDays
              memos={memos}
              onAdd={(text) => act((db) => repo.addMemo(db, { folderId: lesson.folderId, lessonId: lesson.id, songId: null, date: todayYmd(), text }))}
              onEdit={(mid, text) => act((db) => repo.updateMemo(db, mid, text))}
              onDelete={(mid) => act((db) => repo.deleteMemo(db, mid))}
            />
            <LsHeading>録音</LsHeading>
            <RecList
              recs={practiceRecs}
              sub={(r) => {
                const song = r.songId ? data.songs.find((x) => x.id === r.songId) : undefined;
                return song ? { label: song.title, song: true } : { label: '曲なし' };
              }}
            />
          </>
        )}
      </ScrollView>

      {/* 画面の下：まとめ＝録る前は「レッスンを録音」、録音中は暗い帯、録り終わったら何も置かない。個人練＝「個人練を録音」 */}
      {recordingHere ? (
        <Pressable onPress={() => router.push('/recording')} style={[styles.recBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} accessibilityLabel="録音の画面を開く">
          <View style={styles.recDot} />
          <Text style={styles.recText}>録音中 {fmtDur(rec.elapsed)}</Text>
          <Pressable onPress={() => rec.stop()} style={styles.recStop} hitSlop={8} accessibilityRole="button" accessibilityLabel="録音を止める">
            <View style={styles.recStopSq} />
          </Pressable>
        </Pressable>
      ) : view === 'pr' ? (
        <Dock bottom={Math.max(insets.bottom, 16) + 8}>
          <GoButton label="個人練を録音" icon="mic" onPress={() => !busy() && setPractice(true)} />
        </Dock>
      ) : !lessonRec ? (
        <Dock bottom={Math.max(insets.bottom, 16) + 8}>
          <GoButton label="レッスンを録音" icon="mic" onPress={recordLesson} />
        </Dock>
      ) : null}

      <TopicPicker lesson={lesson} visible={picker} onClose={() => setPicker(false)} />
      <TopicSheet lesson={lesson} topic={editTopic} onClose={() => setEditTopic(null)} />
      <PracticeStart lesson={lesson} visible={practice} onClose={() => setPractice(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.card },
  date: { paddingHorizontal: 20, fontSize: 28, fontWeight: '700', lineHeight: 35, color: C.fg },
  segWrap: { paddingTop: 14, paddingHorizontal: 20 },
  player: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, marginHorizontal: 20, padding: 12, borderRadius: 14, backgroundColor: '#f7f3e6' },
  ppl: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  playerText: { flex: 1, fontSize: 15, fontWeight: '600', color: C.fg },
  playerDur: { fontSize: 13, color: C.muted, fontVariant: ['tabular-nums'] },
  recBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 14, paddingHorizontal: 20, backgroundColor: '#1c1c1e' },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.rec },
  recText: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  recStop: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  recStopSq: { width: 14, height: 14, borderRadius: 3, backgroundColor: C.rec },
});
