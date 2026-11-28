import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { SongPicker, songTitle, type SongChoice } from '@/components/song-picker';
import { useScreenInsets } from '@/components/rec-bar';
import { C } from '@/constants/colors';
import { fmtDate } from '@/lib/date';
import { lessonsOf, topicLabel, useLoadedState } from '@/state/app-state';
import { fmtDur, useRecorder, type RecTarget } from '@/state/recorder';

const BARS = 48;

// 録音の画面（白。ほかの画面と同じ）。録音中はふつう操作しないので、画面はできるだけ単純にする。
// 左上の「閉じる」で、録音したまま前の画面に戻れる。
// 個人練・曲の録音は、録る前の状態で開く：曲を選び、一言を書いて、赤丸で録り始める（docs/requirements.md「録音」）。
// 選んだ曲名と、やること・その曲で学んだことを大きく出す（練習しながら見られるように）。止めたら保存して閉じる
// 開き方：個人練は ?lessonId=、曲ページからは ?songId=。何も付けないと、録っている録音を出す
export default function RecordingScreen() {
  const { data } = useLoadedState();
  const rec = useRecorder();
  const insets = useScreenInsets();
  const params = useLocalSearchParams<{ lessonId?: string; songId?: string }>();

  // 録る前に決めておく録音の中身。録っている間は rec.target が持つ
  const [draft] = useState<RecTarget | null>(() => (rec.target ? null : draftFrom(data, params)));
  const [choice, setChoice] = useState<SongChoice>(draft?.songId ?? null);
  const [note, setNote] = useState(rec.target?.note ?? '');
  const [linkLesson, setLinkLesson] = useState(rec.target?.linkLesson ?? true);
  const [picker, setPicker] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.06));
  const last = useRef(-1);
  const [stopping, setStopping] = useState(false);

  const t = rec.target;
  const recording = !!t;

  // 音の大きさを右から流す
  useEffect(() => {
    if (!t || rec.elapsed === last.current) return;
    last.current = rec.elapsed;
    setLevels((v) => [...v.slice(1), Math.max(0.06, rec.level)]);
  }, [rec.elapsed, rec.level, t]);

  // 録っておらず、録る前でもないなら閉じる（別の画面で止めたときなど）
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!t && !stopping && (started || !draft)) router.back();
  }, [t, stopping, started, draft]);

  // 赤丸 → 赤い四角（停止）に形を変える
  const shape = useRef(new Animated.Value(recording ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(shape, { toValue: recording ? 1 : 0, duration: 260, useNativeDriver: false }).start();
  }, [recording, shape]);

  const ctx: RecTarget | null = t ?? (draft ? { ...draft, songId: choice } : null);
  if (!ctx) return <View style={styles.screen} />;

  const lesson = ctx.lessonId ? data.lessons.find((l) => l.id === ctx.lessonId) : undefined;
  const song = ctx.songId ? data.songs.find((s) => s.id === ctx.songId) : undefined;
  const linked = !ctx.fromSong || (t ? t.linkLesson !== false : linkLesson);
  const title = ctx.kind === 'lesson' && lesson ? `${fmtDate(lesson.date)}のレッスン` : ctx.kind === 'practice' && linked ? '個人練' : '曲の録音';

  const begin = async () => {
    if (!draft) return;
    const ok = await rec.start({ ...draft, songId: choice, note, linkLesson });
    if (ok) setStarted(true);
  };
  const stop = async () => {
    setStopping(true);
    await rec.stop();
    router.back();
  };
  const changeNote = (v: string) => {
    setNote(v);
    if (t) rec.update({ note: v });
  };
  const changeLink = () => {
    setLinkLesson(!linkLesson);
    if (t) rec.update({ linkLesson: !linkLesson });
  };

  // 個人練で出すもの：やること、選んだ曲で学んだこと（曲なしなら学んだことをすべて）。
  // 曲だけの録音は、その曲をトピックにした直近のレッスンで学んだこと
  const songLesson =
    ctx.kind !== 'lesson' && ctx.songId && (!lesson || !linked)
      ? [...data.lessons]
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .find((l) => l.folderId === ctx.folderId && l.topics.some((x) => x.kind === 'song' && x.songId === ctx.songId))
      : undefined;
  const src = ctx.kind === 'practice' && linked ? lesson : songLesson;
  const homework = ctx.kind === 'practice' && linked && lesson ? lesson.homework : [];
  const learned =
    ctx.kind !== 'lesson' && src
      ? src.learned.filter((n) => {
          if (!ctx.songId) return true;
          const tp = src.topics.find((x) => x.key === n.topicKey);
          return tp?.kind === 'song' && tp.songId === ctx.songId;
        })
      : [];

  const size = shape.interpolate({ inputRange: [0, 1], outputRange: [60, 30] });
  const radius = shape.interpolate({ inputRange: [0, 1], outputRange: [30, 6] });

  return (
    <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} style={styles.close} hitSlop={8} accessibilityRole="button">
          <Icon name="closeDown" size={18} color={C.accent} />
          <Text style={styles.closeText}>閉じる</Text>
        </Pressable>
        <Text style={styles.barTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 70 }} />
      </View>

      {/* 上：曲名と、その下に小さくメモ（タップするとその場で書ける） */}
      {ctx.kind !== 'lesson' && (
        <View style={styles.head}>
          {/* 録る前は押して曲を選べる。録り始めたら変えない */}
          <Pressable
            disabled={recording}
            onPress={() => setPicker(true)}
            style={styles.songRow}
            accessibilityRole="button"
            accessibilityLabel={recording ? undefined : '録音内容を選ぶ'}>
            {song && <Icon name="note" size={18} color={C.muted} />}
            <Text style={styles.song} numberOfLines={2}>
              {song ? song.title : songTitle(data.songs, ctx.songId)}
            </Text>
            {!recording && <Icon name="down" size={18} color={C.muted} />}
          </Pressable>
          {memoOpen ? (
            <TextInput
              value={note}
              onChangeText={changeNote}
              autoFocus
              onBlur={() => setMemoOpen(false)}
              onSubmitEditing={() => setMemoOpen(false)}
              returnKeyType="done"
              style={styles.memoInput}
              accessibilityLabel="メモ"
            />
          ) : (
            <Pressable onPress={() => setMemoOpen(true)} style={styles.memo} hitSlop={8} accessibilityRole="button" accessibilityLabel="メモを書く">
              <Icon name="pen" size={13} color={note ? C.fg : C.muted} />
              <Text style={[styles.memoText, !!note && { color: C.fg }]} numberOfLines={2}>
                {note || 'メモ'}
              </Text>
            </Pressable>
          )}
          {ctx.fromSong && lesson && (
            <Pressable onPress={changeLink} style={styles.toggle} accessibilityRole="checkbox" accessibilityState={{ checked: linked }}>
              <View style={[styles.box, linked && styles.boxOn]}>{linked && <Icon name="check" size={12} color="#fff" />}</View>
              <Text style={styles.toggleText}>{fmtDate(lesson.date)}のレッスン後の個人練</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* 真ん中：時間と波形を大きく */}
      <View style={styles.meter}>
        <View style={[styles.state, !recording && { opacity: 0 }]}>
          <View style={styles.dot} />
          <Text style={styles.stateText}>録音中</Text>
        </View>
        <Text style={[styles.time, !recording && { color: C.chevron }]}>{fmtDur(rec.elapsed)}</Text>
        <View style={styles.wave}>
          {levels.map((v, i) => (
            <View key={i} style={[styles.waveBar, { height: `${Math.round(v * 100)}%` }, !recording && { backgroundColor: C.line }]} />
          ))}
        </View>
        <Text style={[styles.hint, !recording && { opacity: 0 }]}>録音中は画面が消えないようにしています</Text>
      </View>

      {/* 下：やること・学んだこと（練習しながら見られるように）。多いときはこの中でスクロール */}
      {(homework.length > 0 || (learned.length > 0 && src)) && (
        <ScrollView style={styles.notes} contentContainerStyle={{ padding: 16, gap: 14 }}>
          {homework.length > 0 && (
            <View style={{ gap: 4 }}>
              <Text style={styles.cap}>やること</Text>
              {homework.map((h) => (
                <Text key={h.id} style={styles.big}>
                  {h.text}
                </Text>
              ))}
            </View>
          )}
          {learned.length > 0 && src && (
            <View style={{ gap: 4 }}>
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
      )}

      <View style={[styles.btnWrap, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={recording ? stop : begin}
          disabled={stopping}
          style={styles.ring}
          accessibilityRole="button"
          accessibilityLabel={recording ? '録音を止める' : '録音を始める'}>
          <Animated.View style={{ width: size, height: size, borderRadius: radius, backgroundColor: C.rec }} />
        </Pressable>
        <Text style={styles.btnLabel}>{recording ? '停止' : '録音'}</Text>
      </View>

      {draft && (
        <SongPicker
          folderId={draft.folderId}
          lessonId={draft.lessonId}
          visible={picker}
          choice={choice}
          onChoose={setChoice}
          onClose={() => setPicker(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// 開いたときの録音の中身。
// 個人練：曲は、このフォルダで前回録音した曲（前回が曲なしなら曲なし）。まだなければ、このレッスンで扱った最初の曲。
// 曲ページから：その曲で、既定でそのフォルダの直近のレッスン後の個人練にする
function draftFrom(data: ReturnType<typeof useLoadedState>['data'], params: { lessonId?: string; songId?: string }): RecTarget | null {
  if (params.lessonId) {
    const lesson = data.lessons.find((l) => l.id === params.lessonId);
    if (!lesson) return null;
    const last = data.recordings.find((r) => r.folderId === lesson.folderId && r.kind === 'practice');
    const first = lesson.topics.flatMap((x) => (x.kind === 'song' ? [x.songId] : []))[0] ?? null;
    return { kind: 'practice', folderId: lesson.folderId, lessonId: lesson.id, songId: last ? last.songId : first };
  }
  if (params.songId) {
    const song = data.songs.find((s) => s.id === params.songId);
    if (!song) return null;
    const latest = lessonsOf(data, song.folderId)[0];
    return { kind: latest ? 'practice' : 'song', folderId: song.folderId, lessonId: latest?.id ?? null, songId: song.id, fromSong: true };
  }
  return null;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.card },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  close: { width: 70, flexDirection: 'row', alignItems: 'center', gap: 2 },
  closeText: { color: C.accent, fontSize: 16 },
  barTitle: { flex: 1, textAlign: 'center', color: C.fg, fontSize: 16, fontWeight: '700' },
  head: { alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: 12 },
  songRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  song: { color: C.fg, fontSize: 26, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
  memo: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%', paddingVertical: 2 },
  memoText: { color: C.muted, fontSize: 15, flexShrink: 1 },
  memoInput: { alignSelf: 'stretch', textAlign: 'center', fontSize: 15, color: C.fg, paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  cap: { color: C.accent, fontSize: 12, fontWeight: '700' },
  big: { color: C.fg, fontSize: 18, fontWeight: '700', lineHeight: 26 },
  mid: { color: '#3a3a3c', fontSize: 15, lineHeight: 22 },
  notes: { flexGrow: 0, maxHeight: '34%', marginHorizontal: 16, borderRadius: 16, backgroundColor: C.bg },
  meter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16 },
  state: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.rec },
  stateText: { color: C.rec, fontSize: 14, fontWeight: '600' },
  time: { color: C.fg, fontSize: 64, fontWeight: '300', fontVariant: ['tabular-nums'] },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 80, paddingHorizontal: 24, alignSelf: 'stretch', justifyContent: 'center' },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: C.accent },
  hint: { color: C.muted, fontSize: 12 },
  btnWrap: { alignItems: 'center', gap: 6, paddingTop: 8 },
  ring: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  btnLabel: { color: C.muted, fontSize: 13 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  box: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: C.chevron, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.accent, borderColor: C.accent },
  toggleText: { color: C.muted, fontSize: 14 },
});
