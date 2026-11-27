import { Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dock, LsHeading, NoneYet, TopicHeading } from '@/components/lesson-parts';
import { LineList } from '@/components/line-list';
import { MemoDays } from '@/components/memo-days';
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
  const notYet = (what: string) => Alert.alert(what, '録音は次の区切りで作ります。');

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
                  onAdd={(text) => act((db) => repo.addLine(db, lesson.id, 'learned', t ? t.key : null, text))}
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
            <NoneYet />
          </>
        )}
      </ScrollView>

      <Dock bottom={Math.max(insets.bottom, 16) + 8}>
        {view === 'sum' ? (
          <GoButton label="レッスンを録音" icon="mic" onPress={() => notYet('レッスンを録音')} />
        ) : (
          <GoButton label="個人練を録音" icon="mic" onPress={() => notYet('個人練を録音')} />
        )}
      </Dock>

      <TopicPicker lesson={lesson} visible={picker} onClose={() => setPicker(false)} />
      <TopicSheet lesson={lesson} topic={editTopic} onClose={() => setEditTopic(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.card },
  date: { paddingHorizontal: 20, fontSize: 28, fontWeight: '700', lineHeight: 35, color: C.fg },
  segWrap: { paddingTop: 14, paddingHorizontal: 20 },
});
