import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { C } from '@/constants/colors';
import * as repo from '@/db/repo';
import type { Lesson, Topic } from '@/data/types';
import { topicLabel, useLoadedState } from '@/state/app-state';
import { Icon } from './icon';
import { Sheet } from './sheet';
import { GoButton } from './ui';

// 学んだことの見出しをタップしたとき：名前を変える（曲以外のトピック）、トピックを外す（行は「トピックなし」に戻る）
export function TopicSheet({ lesson, topic, onClose }: { lesson: Lesson; topic: Topic | null; onClose: () => void }) {
  const { data, act } = useLoadedState();
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (topic?.kind === 'word') setLabel(topic.label);
  }, [topic]);
  return (
    <Sheet visible={!!topic} onClose={onClose}>
      {topic && (
        <View style={{ gap: 10 }}>
          <Text style={styles.title}>トピック</Text>
          {topic.kind === 'song' ? (
            <View style={styles.songRow}>
              <Icon name="note" size={14} color={C.muted} />
              <Text style={styles.song}>{topicLabel(data, topic)}</Text>
            </View>
          ) : (
            <>
              <TextInput value={label} onChangeText={setLabel} style={styles.input} returnKeyType="done" accessibilityLabel="トピックの名前" />
              <GoButton
                label="保存"
                onPress={() => {
                  const v = label.trim();
                  if (v && v !== topic.label) act((db) => repo.renameWordTopic(db, lesson.id, topic.key, v));
                  onClose();
                }}
              />
            </>
          )}
          <Pressable
            onPress={() => {
              act((db) => repo.removeTopic(db, lesson.id, topic.key));
              onClose();
            }}
            style={styles.remove}
            accessibilityRole="button">
            <Text style={styles.removeText}>トピックを外す</Text>
          </Pressable>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '700', color: C.fg },
  songRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  song: { fontSize: 17, fontWeight: '600', color: C.fg },
  input: { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 17, color: C.fg },
  remove: { alignItems: 'center', paddingVertical: 14 },
  removeText: { fontSize: 16, color: C.rec },
});
