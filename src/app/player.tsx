import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PopupMenu, type Anchor } from '@/components/popup-menu';
import { Sheet } from '@/components/sheet';
import { C } from '@/constants/colors';
import * as repo from '@/db/repo';
import type { Recording } from '@/data/types';
import { deleteRecordingFiles } from '@/lib/audio-files';
import { chapterAt, chapterSegments, fakeWave } from '@/lib/chapters';
import { topicLabel, useLoadedState } from '@/state/app-state';
import { recSub, recTitle, usePlayer } from '@/state/player';
import { fmtDur } from '@/state/recorder';

const DARK = '#1c1c1e';
const BARS = 56;
const RATES = [0.5, 0.75, 1, 1.25, 1.5];

// 再生画面。どの録音でも同じ画面で、違うのはチャプターの有無だけ（レッスン録音にだけある）。
// 録音が主役で、しおりがコメントのように流れる（ライブ配信のアーカイブのような画面）
export default function PlayerScreen() {
  const { data, act } = useLoadedState();
  const p = usePlayer();
  const rec = data.recordings.find((r) => r.id === p.recId);
  useEffect(() => {
    if (!rec) router.back();
  }, [rec]);
  if (!rec) return <View style={{ flex: 1, backgroundColor: DARK }} />;
  return <PlayerBody rec={rec} act={act} />;
}

function PlayerBody({ rec, act }: { rec: Recording; act: ReturnType<typeof useLoadedState>['act'] }) {
  const { data } = useLoadedState();
  const p = usePlayer();
  const insets = useSafeAreaInsets();
  const lesson = rec.kind === 'lesson' ? data.lessons.find((l) => l.id === rec.lessonId) : undefined;
  const dur = p.duration || rec.duration;
  const pos = Math.min(p.position, dur);
  const pct = dur > 0 ? pos / dur : 0;
  const [waveW, setWaveW] = useState(0);
  const [input, setInput] = useState('');
  const [menu, setMenu] = useState<Anchor | null>(null);
  const [rateSheet, setRateSheet] = useState(false);
  const [chapSheet, setChapSheet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // 削除の確認シートが閉じきってからやること
  const afterDelete = useRef<(() => void) | null>(null);
  const run = (r: { current: (() => void) | null }) => {
    const f = r.current;
    r.current = null;
    f?.();
  };
  const moreRef = useRef<ComponentRef<typeof Pressable>>(null);
  const listRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const wave = fakeWave(rec.id, BARS);

  // しおり：レッスン録音なら学んだことの行（時間付き）、ほかの録音ならその録音のしおり
  const marks = lesson
    ? lesson.learned.filter((n) => n.at != null).map((n) => ({ id: n.id, at: n.at as number, text: n.text, topicKey: n.topicKey }))
    : rec.marks.map((m) => ({ id: m.id, at: m.at, text: m.text, topicKey: null as string | null }));
  marks.sort((a, b) => a.at - b.at);
  const shown = marks.filter((m) => m.at <= pos);
  const label = (key: string | null) => {
    const tp = lesson?.topics.find((x) => x.key === key);
    return tp ? topicLabel(data, tp) : 'トピックなし';
  };

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [shown.length]);

  // 波形を指で動かす
  const seekAt = (e: GestureResponderEvent) => {
    if (waveW > 0) p.seek((Math.max(0, Math.min(waveW, e.nativeEvent.locationX)) / waveW) * dur);
  };

  // しおりを足す。名前を書かなければ「しおり 1」「しおり 2」…。レッスン録音なら、トピックは今の区間のもの
  const addMark = () => {
    const at = Math.floor(pos);
    const v = input.trim();
    const n = (lesson ? lesson.learned.filter((x) => x.bookmark).length : rec.marks.filter((x) => x.bookmark).length) + 1;
    const text = v || `しおり ${n}`;
    if (lesson) act((db) => repo.addLessonMark(db, lesson.id, chapterAt(lesson, at), text, at, !v));
    else act((db) => repo.addRecMark(db, rec.id, text, at, !v));
    setInput('');
  };

  const segs = lesson ? chapterSegments(lesson, dur) : [];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.card }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.top, { paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <Pressable onPress={() => router.back()} style={styles.close} hitSlop={8} accessibilityRole="button">
            <Icon name="closeDown" size={18} color="#fff" />
            <Text style={styles.closeText}>閉じる</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {recTitle(data, rec)}
          </Text>
          <Pressable
            ref={moreRef}
            onPress={() => moreRef.current?.measureInWindow((x, y, w, h) => setMenu({ top: y + h + 6, right: 12 }))}
            style={styles.more}
            hitSlop={8}
            accessibilityLabel="そのほか">
            <Icon name="more" size={22} color="#fff" />
          </Pressable>
        </View>

        <Text style={styles.now}>{fmtDur(pos)}</Text>
        {lesson ? (
          <Pressable onPress={() => setChapSheet(true)} style={styles.chip} accessibilityLabel="この時間からのトピックを選ぶ">
            <Text style={styles.chipText} numberOfLines={1}>
              {recSub(data, rec, pos)}
            </Text>
            <Icon name="down" size={12} color="#fff" />
          </Pressable>
        ) : (
          <Text style={styles.sub}>{recSub(data, rec, pos)}</Text>
        )}

        <View
          style={styles.wave}
          onLayout={(e) => setWaveW(e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={seekAt}
          onResponderMove={seekAt}
          accessibilityLabel="再生する位置">
          {wave.map((v, i) => (
            <View key={i} pointerEvents="none" style={[styles.waveBar, { height: `${v * 100}%` }, (i + 0.5) / BARS < pct && { backgroundColor: C.accent }]} />
          ))}
          {waveW > 0 &&
            marks.map((m) => <View key={m.id} pointerEvents="none" style={[styles.flag, { left: (m.at / dur) * waveW - 2 }]} />)}
          {waveW > 0 && <View pointerEvents="none" style={[styles.head, { left: pct * waveW - 1 }]} />}
        </View>
        {lesson && waveW > 0 && (
          <View style={styles.cuts}>
            {segs.map((s) => {
              const on = pos >= s.from && pos < s.to;
              const left = (s.from / dur) * waveW;
              const width = ((s.to - s.from) / dur) * waveW;
              return (
                <View key={s.from} style={{ position: 'absolute', left: left + 1, width: Math.max(0, width - 2), top: 0 }}>
                  <View style={[styles.cut, on && { backgroundColor: C.accent }]} />
                  {width > waveW * 0.14 && (
                    <Text style={[styles.cutLabel, on && { color: '#fff' }]} numberOfLines={1}>
                      {label(s.topicKey)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
        <View style={styles.ends}>
          <Text style={styles.endText}>0:00</Text>
          <Text style={styles.endText}>{fmtDur(dur)}</Text>
        </View>
        <View style={styles.ctl}>
          <Pressable onPress={() => p.skip(-15)} hitSlop={8} accessibilityLabel="15秒戻る">
            <Icon name="back15" size={30} color="#fff" />
          </Pressable>
          <Pressable onPress={() => (p.playing ? p.toggle() : p.play(rec))} style={styles.pp} accessibilityLabel={p.playing ? '一時停止' : '再生'}>
            <Icon name={p.playing ? 'pause' : 'play'} size={30} color={DARK} />
          </Pressable>
          <Pressable onPress={() => p.skip(15)} hitSlop={8} accessibilityLabel="15秒進む">
            <Icon name="fwd15" size={30} color="#fff" />
          </Pressable>
        </View>
        {p.rate !== 1 && <Text style={styles.rate}>{p.rate}倍</Text>}
      </View>

      <Text style={styles.listHead}>ここまでのしおり</Text>
      <ScrollView ref={listRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
        {shown.length === 0 && <Text style={styles.empty}>ここまでのしおりはまだありません</Text>}
        {shown.map((m, i) => {
          const head = lesson && (i === 0 || shown[i - 1].topicKey !== m.topicKey);
          const cur = i === shown.length - 1;
          return (
            <View key={m.id}>
              {head && <Text style={styles.group}>{label(m.topicKey)}</Text>}
              <Pressable onPress={() => p.seek(m.at)} style={styles.mark}>
                <Text style={[styles.markAt, cur && { color: C.accentDark }]}>{fmtDur(m.at)}</Text>
                <Text style={[styles.markText, cur ? { fontWeight: '700' } : m.at < pos - 600 && { color: C.muted }]}>{m.text}</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={`${fmtDur(pos)} にしおり（名前はなくてもいい）`}
          placeholderTextColor={C.muted}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={addMark}
          accessibilityLabel="しおりの名前"
        />
        <Pressable onPress={addMark} style={styles.add} accessibilityRole="button">
          <Text style={styles.addText}>追加</Text>
        </Pressable>
      </View>

      <PopupMenu
        visible={!!menu}
        anchor={menu}
        onClose={() => setMenu(null)}
        items={[
          { key: 'rate', label: `再生の速さ（${p.rate}倍）`, icon: 'play', onPress: () => setRateSheet(true) },
          { key: 'del', label: '録音を削除', icon: 'close', onPress: () => setConfirmDelete(true) },
        ]}
      />

      <Sheet visible={rateSheet} onClose={() => setRateSheet(false)}>
        <Text style={styles.sheetTitle}>再生の速さ</Text>
        <Text style={styles.sheetNote}>速さを変えても、音の高さは変わりません</Text>
        {RATES.map((r) => (
          <Pressable key={r} onPress={() => (p.setRate(r), setRateSheet(false))} style={styles.opt}>
            <View style={styles.ck}>{p.rate === r && <Icon name="check" size={15} color={C.accent} />}</View>
            <Text style={styles.optText}>{r}倍</Text>
          </Pressable>
        ))}
      </Sheet>

      {lesson && (
        <Sheet visible={chapSheet} onClose={() => setChapSheet(false)}>
          <Text style={styles.sheetTitle}>{fmtDur(pos)} からのトピック</Text>
          {[...lesson.topics.map((t) => t.key as string | null), null].map((k) => (
            <Pressable
              key={k ?? 'none'}
              onPress={() => {
                act((db) => repo.setChapterCut(db, lesson.id, Math.floor(pos), k));
                setChapSheet(false);
              }}
              style={styles.opt}>
              <View style={styles.ck}>{chapterAt(lesson, pos) === k && <Icon name="check" size={15} color={C.accent} />}</View>
              <Text style={styles.optText}>{label(k)}</Text>
            </Pressable>
          ))}
        </Sheet>
      )}

      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} onClosed={() => run(afterDelete)}>
        <Text style={styles.sheetTitle}>「{recTitle(data, rec)}」の録音を削除</Text>
        <Text style={styles.sheetNote}>
          {lesson
            ? '元に戻せません。書いた行は残ります（録音の時間は外れます）。名前のないしおりは消えます。'
            : '元に戻せません。しおりも一緒に消えます。'}
        </Text>
        <Pressable
          onPress={() => {
            // 消すと再生画面が閉じるので、シートが閉じきってから消す（閉じる途中で画面ごと消すと、シートが下へずれて消える）
            afterDelete.current = async () => {
              p.close();
              const file = await act((db) => repo.deleteRecording(db, rec.id));
              if (file) deleteRecordingFiles([file]);
            };
            setConfirmDelete(false);
          }}
          style={styles.danger}
          accessibilityRole="button">
          <Text style={styles.dangerText}>削除</Text>
        </Pressable>
        <Pressable onPress={() => setConfirmDelete(false)} style={{ alignItems: 'center', paddingVertical: 14 }}>
          <Text style={{ fontSize: 16, color: C.accentDark }}>やめる</Text>
        </Pressable>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: DARK, paddingBottom: 16 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  close: { width: 70, flexDirection: 'row', alignItems: 'center', gap: 2 },
  closeText: { color: '#fff', fontSize: 16 },
  title: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 15, fontWeight: '700' },
  more: { width: 70, alignItems: 'flex-end' },
  now: { color: '#fff', fontSize: 44, fontWeight: '300', textAlign: 'center', fontVariant: ['tabular-nums'] },
  chip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: '#3a3a3c',
  },
  chipText: { color: '#fff', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  sub: { color: '#aeaeb2', fontSize: 13, textAlign: 'center', marginTop: 6 },
  wave: { height: 64, marginTop: 16, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: '#5a5a5e' },
  flag: { position: 'absolute', top: -6, width: 4, height: 8, borderRadius: 1, backgroundColor: '#ff9f0a' },
  head: { position: 'absolute', top: -4, bottom: -4, width: 2, backgroundColor: '#fff' },
  cuts: { height: 22, marginTop: 6, marginHorizontal: 20 },
  cut: { height: 3, borderRadius: 2, backgroundColor: '#48484a' },
  cutLabel: { marginTop: 3, fontSize: 10, color: '#8e8e93' },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 2 },
  endText: { color: '#8e8e93', fontSize: 11, fontVariant: ['tabular-nums'] },
  ctl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40, marginTop: 10 },
  pp: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  rate: { color: C.accent, textAlign: 'center', fontSize: 12, marginTop: 6 },
  listHead: { fontSize: 13, color: C.muted, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  empty: { paddingHorizontal: 20, paddingVertical: 8, color: C.muted, fontSize: 14 },
  group: { paddingHorizontal: 20, paddingTop: 10, fontSize: 12, fontWeight: '700', color: '#48484a' },
  mark: { flexDirection: 'row', gap: 10, paddingVertical: 6, paddingHorizontal: 20 },
  markAt: { width: 44, fontSize: 13, color: C.accent, fontWeight: '600', fontVariant: ['tabular-nums'], lineHeight: 22 },
  markText: { flex: 1, fontSize: 15, color: C.fg, lineHeight: 22 },
  inputRow: { flexDirection: 'row', gap: 8, paddingTop: 8, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  input: { flex: 1, minWidth: 0, height: 42, borderRadius: 12, backgroundColor: C.bg, paddingHorizontal: 12, fontSize: 15, color: C.fg },
  add: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  addText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: C.fg },
  sheetNote: { marginTop: 6, marginBottom: 8, fontSize: 14, lineHeight: 21, color: C.muted },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  ck: { width: 20, alignItems: 'center' },
  optText: { fontSize: 16, color: C.fg },
  danger: { marginTop: 8, height: 54, borderRadius: 14, backgroundColor: C.rec, alignItems: 'center', justifyContent: 'center' },
  dangerText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
