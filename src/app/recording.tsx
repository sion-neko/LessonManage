import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { GoButton } from '@/components/ui';
import { C } from '@/constants/colors';
import * as repo from '@/db/repo';
import { fmtDate } from '@/lib/date';
import { topicLabel, useLoadedState } from '@/state/app-state';
import { fmtDur, useRecorder } from '@/state/recorder';

const DARK = '#1c1c1e';
const BARS = 48;

// 録音中の画面（暗い色）。録音中はふつう操作しないので、画面はできるだけ単純にする。
// 左上の「閉じる」で、録音したまま前の画面に戻れる。
// 個人練は、選んだ曲名と、やること・その曲で学んだことを大きく出す（練習しながら見られるように）。止めたら一言だけ書く
export default function RecordingScreen() {
  const { data, act } = useLoadedState();
  const rec = useRecorder();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.06));
  const last = useRef(-1);
  // この画面で止めている間は、録音がなくなっても閉じない（止めたあとに一言を書くため）
  const [stopping, setStopping] = useState(false);
  // 曲ページから録ったとき：直近のレッスン後の個人練にするか（既定はする。外すと曲だけの録音）
  const [fromSong, setFromSong] = useState(false);
  const [linkLesson, setLinkLesson] = useState(true);

  // 音の大きさを右から流す
  useEffect(() => {
    if (!rec.target || rec.elapsed === last.current) return;
    last.current = rec.elapsed;
    setLevels((v) => [...v.slice(1), Math.max(0.06, rec.level)]);
  }, [rec.elapsed, rec.level, rec.target]);

  // 録音も、保存したあとの一言もないなら閉じる（別の画面で止めたときなど）
  useEffect(() => {
    if (!rec.target && !saved && !stopping) router.back();
  }, [rec.target, saved, stopping]);

  const t = rec.target;
  const savedRec = saved ? data.recordings.find((r) => r.id === saved) : null;
  const ctx = t ?? savedRec;
  if (!ctx) return <View style={styles.screen} />;
  const lesson = ctx.lessonId ? data.lessons.find((l) => l.id === ctx.lessonId) : undefined;
  const song = ctx.songId ? data.songs.find((s) => s.id === ctx.songId) : undefined;
  const title = ctx.kind === 'lesson' && lesson ? `${fmtDate(lesson.date)}のレッスン` : ctx.kind === 'practice' ? '個人練' : (song?.title ?? '録音');

  const stop = async () => {
    const kind = rec.target?.kind;
    setFromSong(!!rec.target?.fromSong);
    setStopping(true);
    const id = await rec.stop();
    if (id && kind !== 'lesson') setSaved(id);
    else router.back();
    setStopping(false);
  };

  // 止めたあと：一言だけ書く
  if (savedRec) {
    const finish = async () => {
      const v = note.trim();
      if (v) await act((db) => repo.setRecordingNote(db, savedRec.id, v));
      if (fromSong && savedRec.lessonId && !linkLesson) await act((db) => repo.setRecordingLesson(db, savedRec.id, null));
      router.back();
    };
    return (
      <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top + 24 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: 24, gap: 14 }}>
          <Text style={styles.savedTitle}>録音を保存しました</Text>
          <Text style={styles.savedSub}>
            {song ? song.title : '曲なし'}・{fmtDur(savedRec.duration)}
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="一言（なくてもいい）"
            placeholderTextColor="#8e8e93"
            autoFocus
            style={styles.noteInput}
            returnKeyType="done"
            onSubmitEditing={finish}
            accessibilityLabel="一言"
          />
          {fromSong && lesson && (
            <Pressable onPress={() => setLinkLesson(!linkLesson)} style={styles.toggle} accessibilityRole="checkbox" accessibilityState={{ checked: linkLesson }}>
              <View style={[styles.box, linkLesson && styles.boxOn]}>{linkLesson && <Icon name="check" size={13} color="#fff" />}</View>
              <Text style={styles.toggleText}>{fmtDate(lesson.date)}のレッスン後の個人練</Text>
            </Pressable>
          )}
          <GoButton label="閉じる" onPress={finish} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // 個人練で出すもの：やること、選んだ曲で学んだこと（曲なしなら学んだことをすべて）。
  // 曲だけの録音は、その曲をトピックにした直近のレッスンで学んだこと
  const songLesson =
    ctx.kind === 'song' && ctx.songId
      ? [...data.lessons]
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .find((l) => l.folderId === ctx.folderId && l.topics.some((x) => x.kind === 'song' && x.songId === ctx.songId))
      : undefined;
  const src = ctx.kind === 'practice' ? lesson : songLesson;
  const homework = ctx.kind === 'practice' && lesson ? lesson.homework : [];
  const learned =
    ctx.kind !== 'lesson' && src
      ? src.learned.filter((n) => {
          if (!ctx.songId) return true;
          const tp = src.topics.find((x) => x.key === n.topicKey);
          return tp?.kind === 'song' && tp.songId === ctx.songId;
        })
      : [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} style={styles.close} hitSlop={8} accessibilityRole="button">
          <Icon name="closeDown" size={18} color="#fff" />
          <Text style={styles.closeText}>閉じる</Text>
        </Pressable>
        <Text style={styles.barTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 70 }} />
      </View>

      {ctx.kind !== 'lesson' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, gap: 18 }}>
          <View style={styles.songRow}>
            {song && <Icon name="note" size={20} color="#aeaeb2" />}
            <Text style={styles.song}>{song ? song.title : '曲なし'}</Text>
          </View>
          {homework.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={styles.cap}>やること</Text>
              {homework.map((h) => (
                <Text key={h.id} style={styles.big}>
                  {h.text}
                </Text>
              ))}
            </View>
          )}
          {learned.length > 0 && src && (
            <View style={{ gap: 6 }}>
              <Text style={styles.cap}>学んだこと</Text>
              {learned.map((n) => {
                const tp = src.topics.find((x) => x.key === n.topicKey);
                return (
                  <Text key={n.id} style={styles.mid}>
                    {!ctx.songId && tp ? `${topicLabel(data, tp)}：` : ''}
                    {n.text}
                  </Text>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <View style={styles.meter}>
        <View style={styles.state}>
          <View style={styles.dot} />
          <Text style={styles.stateText}>録音中</Text>
        </View>
        <Text style={[styles.time, ctx.kind !== 'lesson' && { fontSize: 40 }]}>{fmtDur(rec.elapsed)}</Text>
        <View style={styles.wave}>
          {levels.map((v, i) => (
            <View key={i} style={[styles.waveBar, { height: `${Math.round(v * 100)}%` }]} />
          ))}
        </View>
        <Text style={styles.hint}>録音中は画面が消えないようにしています</Text>
      </View>

      <View style={[styles.stopWrap, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable onPress={stop} style={styles.stop} accessibilityRole="button" accessibilityLabel="録音を止める">
          <View style={styles.stopSq} />
        </Pressable>
        <Text style={styles.stopLabel}>停止</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DARK },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  close: { width: 70, flexDirection: 'row', alignItems: 'center', gap: 2 },
  closeText: { color: '#fff', fontSize: 16 },
  barTitle: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: '700' },
  songRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  song: { color: '#fff', fontSize: 26, fontWeight: '800', flexShrink: 1 },
  cap: { color: C.accent, fontSize: 13, fontWeight: '700' },
  big: { color: '#fff', fontSize: 21, fontWeight: '700', lineHeight: 30 },
  mid: { color: '#e5e5ea', fontSize: 17, lineHeight: 26 },
  meter: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  state: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.rec },
  stateText: { color: '#ff6961', fontSize: 14, fontWeight: '600' },
  time: { color: '#fff', fontSize: 56, fontWeight: '300', fontVariant: ['tabular-nums'] },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 56, paddingHorizontal: 24, alignSelf: 'stretch', justifyContent: 'center' },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: C.accent },
  hint: { color: '#8e8e93', fontSize: 12 },
  stopWrap: { alignItems: 'center', gap: 6, paddingTop: 8 },
  stop: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stopSq: { width: 30, height: 30, borderRadius: 6, backgroundColor: C.rec },
  stopLabel: { color: '#fff', fontSize: 13 },
  savedTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  savedSub: { color: '#aeaeb2', fontSize: 15 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  box: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#636366', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.accent, borderColor: C.accent },
  toggleText: { color: '#fff', fontSize: 15 },
  noteInput: { backgroundColor: '#2c2c2e', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 17, color: '#fff' },
});
