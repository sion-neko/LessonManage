import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { C } from '@/constants/colors';
import * as repo from '@/db/repo';
import { songsOf, useLoadedState } from '@/state/app-state';
import { Icon } from './icon';

/** 曲の ID、null は曲なし */
export type SongChoice = string | null;

// 録音内容（曲）を選ぶ一覧。画面の真ん中に出す（docs/requirements.md「録音」）
// 並びは、最近録った順の曲 → このレッスンで扱った曲 → ほかの曲 → 曲なし → ＋ 曲を追加…
export function SongPicker({
  folderId,
  lessonId,
  visible,
  choice,
  onChoose,
  onClose,
}: {
  folderId: string;
  lessonId: string | null;
  visible: boolean;
  choice: SongChoice;
  onChoose: (id: SongChoice) => void;
  onClose: () => void;
}) {
  const { data, act } = useLoadedState();
  const [newSong, setNewSong] = useState<string | null>(null);
  const songs = songsOf(data, folderId);
  const lesson = lessonId ? data.lessons.find((l) => l.id === lessonId) : undefined;
  const lessonSongs = lesson ? lesson.topics.flatMap((t) => (t.kind === 'song' ? [t.songId] : [])) : [];
  const practices = data.recordings.filter((r) => r.folderId === folderId && r.kind === 'practice');
  const order: string[] = [];
  for (const r of practices) if (r.songId && !order.includes(r.songId) && songs.some((s) => s.id === r.songId)) order.push(r.songId);
  for (const id of lessonSongs) if (!order.includes(id)) order.push(id);
  for (const s of songs) if (!order.includes(s.id)) order.push(s.id);

  const choose = (id: SongChoice) => {
    onChoose(id);
    setNewSong(null);
    onClose();
  };
  const add = async () => {
    const t = newSong?.trim();
    if (!t) return;
    const id = await act((db) => repo.addSong(db, folderId, t));
    choose(id);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.list}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {order.map((id) => (
              <Option key={id} on={choice === id} label={songTitle(data.songs, id)} song onPress={() => choose(id)} />
            ))}
            <Option on={choice === null} label="曲なし（スケール・基礎練習など）" onPress={() => choose(null)} />
            {newSong === null ? (
              <Pressable onPress={() => setNewSong('')} style={styles.opt}>
                <View style={styles.ck} />
                <Text style={[styles.optText, { color: C.accentDark }]}>＋ 曲を追加…</Text>
              </Pressable>
            ) : (
              <View style={styles.newRow}>
                <TextInput
                  value={newSong}
                  onChangeText={setNewSong}
                  placeholder="曲名"
                  placeholderTextColor={C.muted}
                  autoFocus
                  style={styles.newInput}
                  returnKeyType="done"
                  onSubmitEditing={add}
                />
                <Pressable onPress={add} style={styles.newBtn}>
                  <Text style={styles.newBtnText}>追加</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function songTitle(songs: { id: string; title: string }[], id: SongChoice) {
  return id ? (songs.find((s) => s.id === id)?.title ?? '（消えた曲）') : '曲なし';
}

function Option({ on, label, song, onPress }: { on: boolean; label: string; song?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.opt, pressed && { backgroundColor: C.hl }]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
      <View style={styles.ck}>{on && <Icon name="check" size={15} color={C.accent} />}</View>
      {song && <Icon name="note" size={12} color={C.muted} />}
      <Text style={styles.optText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  list: { maxHeight: '70%', backgroundColor: C.card, borderRadius: 16, paddingVertical: 6, overflow: 'hidden' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 14 },
  ck: { width: 20, alignItems: 'center' },
  optText: { flexShrink: 1, fontSize: 16, color: C.fg },
  newRow: { flexDirection: 'row', gap: 8, padding: 10 },
  newInput: { flex: 1, minWidth: 0, height: 42, borderRadius: 12, backgroundColor: C.bg, paddingHorizontal: 12, fontSize: 16, color: C.fg },
  newBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
