import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { C } from '@/constants/colors';
import * as repo from '@/db/repo';
import type { Lesson } from '@/data/types';
import { fmtDate } from '@/lib/date';
import { songsOf, useLoadedState } from '@/state/app-state';
import { Icon } from './icon';
import { Sheet } from './sheet';

// 「このレッスンのトピック」のシート。このフォルダの曲と、前のレッスンで使った曲以外のトピックが並び、押して丸を付けるだけで選べる。
// 新しい曲・新しいトピックもここで足す
export function TopicPicker({ lesson, visible, onClose }: { lesson: Lesson; visible: boolean; onClose: () => void }) {
  const { data, act } = useLoadedState();
  const [newSong, setNewSong] = useState<string | null>(null);
  const [newWord, setNewWord] = useState('');
  const songs = songsOf(data, lesson.folderId);

  // 曲以外のトピック：このレッスンのもの → ほかのレッスンで使ったもの（新しい順、同じ名前は1つに）
  const words: { label: string; date: string | null }[] = [];
  for (const t of lesson.topics) if (t.kind === 'word') words.push({ label: t.label, date: null });
  for (const l of data.lessons.filter((x) => x.folderId === lesson.folderId && x.id !== lesson.id)) {
    for (const t of l.topics) if (t.kind === 'word' && !words.some((w) => w.label === t.label)) words.push({ label: t.label, date: l.date });
  }

  const songTopic = (songId: string) => lesson.topics.find((t) => t.kind === 'song' && t.songId === songId);
  const wordTopic = (label: string) => lesson.topics.find((t) => t.kind === 'word' && t.label === label);

  const toggleSong = (songId: string) => {
    const t = songTopic(songId);
    act((db) => (t ? repo.removeTopic(db, lesson.id, t.key) : repo.addSongTopic(db, lesson.id, songId)));
  };
  const toggleWord = (label: string) => {
    const t = wordTopic(label);
    act((db) => (t ? repo.removeTopic(db, lesson.id, t.key) : repo.addWordTopic(db, lesson.id, label)));
  };
  const addSong = () => {
    const title = newSong?.trim();
    if (!title) return;
    act(async (db) => {
      const id = await repo.addSong(db, lesson.folderId, title);
      await repo.addSongTopic(db, lesson.id, id);
    });
    setNewSong(null);
  };
  const addWord = () => {
    const label = newWord.trim();
    if (!label) return;
    if (!wordTopic(label)) act((db) => repo.addWordTopic(db, lesson.id, label));
    setNewWord('');
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <Text style={styles.title}>このレッスンのトピック</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={styles.done}>完了</Text>
        </Pressable>
      </View>

      <Text style={styles.group}>曲</Text>
      {songs.map((s) => (
        <Option key={s.id} on={!!songTopic(s.id)} onPress={() => toggleSong(s.id)}>
          <Icon name="note" size={13} color={C.muted} />
          <Text style={styles.optText}>{s.title}</Text>
        </Option>
      ))}
      {newSong === null ? (
        <Pressable onPress={() => setNewSong('')} style={{ paddingVertical: 8 }}>
          <Text style={styles.more}>＋ 新しい曲</Text>
        </Pressable>
      ) : (
        <NewField value={newSong} onChange={setNewSong} placeholder="曲名" onSubmit={addSong} autoFocus />
      )}

      {words.length > 0 && <Text style={styles.group}>曲以外のトピック</Text>}
      {words.map((w) => (
        <Option key={w.label} on={!!wordTopic(w.label)} onPress={() => toggleWord(w.label)} note={w.date ? fmtDate(w.date) : undefined}>
          <Text style={styles.optText}>{w.label}</Text>
        </Option>
      ))}

      <Text style={styles.group}>新しいトピック</Text>
      <NewField value={newWord} onChange={setNewWord} placeholder="例：手首が固まってしまう" onSubmit={addWord} />
    </Sheet>
  );
}

function Option({ on, onPress, note, children }: { on: boolean; onPress: () => void; note?: string; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} style={styles.opt} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
      <View style={[styles.box, on && styles.boxOn]}>{on && <Icon name="check" size={13} color="#fff" />}</View>
      <View style={styles.optBody}>{children}</View>
      {!!note && <Text style={styles.note}>{note}</Text>}
    </Pressable>
  );
}

function NewField({
  value,
  onChange,
  placeholder,
  onSubmit,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onSubmit: () => void;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.newRow}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        style={styles.newInput}
        autoFocus={autoFocus}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={onSubmit}
      />
      <Pressable onPress={onSubmit} style={styles.newBtn} accessibilityRole="button">
        <Text style={styles.newBtnText}>追加</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 4 },
  title: { fontSize: 17, fontWeight: '700', color: C.fg },
  done: { fontSize: 16, fontWeight: '700', color: C.accentDark },
  group: { fontSize: 12, color: C.muted, paddingTop: 14, paddingBottom: 2 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  optBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  optText: { fontSize: 16, color: C.fg, flexShrink: 1 },
  box: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.accent, borderColor: C.accent },
  note: { fontSize: 12, color: C.muted },
  more: { fontSize: 15, color: C.accentDark },
  newRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  newInput: { flex: 1, minWidth: 0, height: 42, borderRadius: 12, backgroundColor: C.card, paddingHorizontal: 14, fontSize: 16, color: C.fg },
  newBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
