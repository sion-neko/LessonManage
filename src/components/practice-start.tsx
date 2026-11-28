import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { C } from '@/constants/colors';
import * as repo from '@/db/repo';
import type { Lesson } from '@/data/types';
import { songsOf, useLoadedState } from '@/state/app-state';
import { useRecorder } from '@/state/recorder';
import { Icon } from './icon';
import { Sheet } from './sheet';
import { GoButton } from './ui';

type Choice = string | null; // 曲の ID、null は曲なし

// 個人練を録る前のシート：「録音内容」のプルダウンと「録音開始」だけ（docs/requirements.md「録音」）
export function PracticeStart({ lesson, visible, onClose }: { lesson: Lesson; visible: boolean; onClose: () => void }) {
  const { data, act } = useLoadedState();
  const rec = useRecorder();
  const songs = songsOf(data, lesson.folderId);
  const title = (id: Choice) => (id ? (songs.find((s) => s.id === id)?.title ?? '（消えた曲）') : '曲なし');

  // 最初に選んでおく曲：このフォルダで前回録音した曲（前回が曲なしなら曲なし）。まだなければ、このレッスンで扱った最初の曲
  const practices = data.recordings.filter((r) => r.folderId === lesson.folderId && r.kind === 'practice');
  const lessonSongs = lesson.topics.flatMap((t) => (t.kind === 'song' ? [t.songId] : []));
  const initial: Choice = practices.length ? practices[0].songId : (lessonSongs[0] ?? null);
  const [choice, setChoice] = useState<Choice>(initial);
  const [listOpen, setListOpen] = useState(false);
  const [newSong, setNewSong] = useState<string | null>(null);
  // 閉じきってからやること。閉じてすぐ次の画面を出すと、iOS がシートを暗い背景ごと下へずらして片付けてしまう
  const afterSheet = useRef<(() => void) | null>(null);
  const afterList = useRef<(() => void) | null>(null);
  const run = (r: { current: (() => void) | null }) => {
    const f = r.current;
    r.current = null;
    f?.();
  };
  useEffect(() => {
    if (visible) setChoice(initial);
    // 開くたびに既定に戻す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // プルダウンの中：最近録った順の曲 → このレッスンで扱った曲 → ほかの曲 → 曲なし → ＋ 曲を追加…
  const order: string[] = [];
  for (const r of practices) if (r.songId && !order.includes(r.songId) && songs.some((s) => s.id === r.songId)) order.push(r.songId);
  for (const id of lessonSongs) if (!order.includes(id)) order.push(id);
  for (const s of songs) if (!order.includes(s.id)) order.push(s.id);

  const begin = async (songId: Choice) => {
    if (rec.target) {
      Alert.alert('録音中です', 'ほかの録音を止めてから');
      return;
    }
    const ok = await rec.start({ kind: 'practice', folderId: lesson.folderId, lessonId: lesson.id, songId });
    if (ok) {
      afterSheet.current = () => router.push('/recording');
      onClose();
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} onClosed={() => run(afterSheet)}>
      <Text style={styles.title}>個人練を録音</Text>
      <Text style={styles.label}>録音内容</Text>
      <Pressable onPress={() => setListOpen(true)} style={styles.select} accessibilityRole="button" accessibilityLabel="録音内容を選ぶ">
        {choice && <Icon name="note" size={13} color={C.muted} />}
        <Text style={styles.selectText} numberOfLines={1}>
          {title(choice)}
        </Text>
        <Icon name="down" size={16} color={C.muted} />
      </Pressable>
      <View style={{ marginTop: 18 }}>
        <GoButton label="録音開始" icon="mic" onPress={() => begin(choice)} />
      </View>

      {/* 選択肢の一覧は画面の真ん中に出す */}
      <Modal visible={listOpen} transparent animationType="fade" onRequestClose={() => setListOpen(false)} onDismiss={() => run(afterList)}>
        <Pressable style={styles.dim} onPress={() => setListOpen(false)} />
        <View style={styles.center} pointerEvents="box-none">
          <View style={styles.list}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {order.map((id) => (
                <Option key={id} on={choice === id} label={title(id)} song onPress={() => (setChoice(id), setListOpen(false))} />
              ))}
              <Option on={choice === null} label="曲なし（スケール・基礎練習など）" onPress={() => (setChoice(null), setListOpen(false))} />
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
                    onSubmitEditing={() => addAndStart()}
                  />
                  <Pressable onPress={() => addAndStart()} style={styles.newBtn}>
                    <Text style={styles.newBtnText}>追加して録音</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Sheet>
  );

  // 曲を追加すると、その曲でそのまま録音を始める
  async function addAndStart() {
    const t = newSong?.trim();
    if (!t) return;
    const id = await act((db) => repo.addSong(db, lesson.folderId, t));
    setNewSong(null);
    setChoice(id);
    // 一覧が消えきってから録音を始める（一覧とシートを同時に片付けると、iOS がまとめて下へずらす）
    afterList.current = () => void begin(id);
    setListOpen(false);
  }
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
  title: { fontSize: 17, fontWeight: '700', color: C.fg },
  label: { marginTop: 16, marginBottom: 6, fontSize: 12, color: C.muted },
  select: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  selectText: { flex: 1, fontSize: 17, color: C.fg },
  dim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  list: { maxHeight: '70%', backgroundColor: C.card, borderRadius: 16, paddingVertical: 6, overflow: 'hidden' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 14 },
  ck: { width: 20, alignItems: 'center' },
  optText: { flexShrink: 1, fontSize: 16, color: C.fg },
  newRow: { flexDirection: 'row', gap: 8, padding: 10 },
  newInput: { flex: 1, minWidth: 0, height: 42, borderRadius: 12, backgroundColor: C.bg, paddingHorizontal: 12, fontSize: 16, color: C.fg },
  newBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center' },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
