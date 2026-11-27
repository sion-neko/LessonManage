import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FolderHeader } from '@/components/folder-header';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { C } from '@/constants/colors';
import type { Lesson, Line, Memo, Recording } from '@/data/types';
import { fakeWave } from '@/lib/chapters';
import { fmtDate, fmtDateLong } from '@/lib/date';
import { lessonsOf, songsOf, topicLabel, useLoadedState } from '@/state/app-state';
import { recTitle, usePlayer } from '@/state/player';
import { fmtDur } from '@/state/recorder';

type Period = 'all' | 'm1' | 'm3';
const PERIOD: Record<Period, string> = { all: 'すべての期間', m1: '1か月', m3: '3か月' };

type Item =
  | { t: 'lesson'; date: string; o: 0; lesson: Lesson }
  | { t: 'line'; date: string; o: 1; lesson: Lesson; line: Line }
  | { t: 'memo'; date: string; o: 2; memo: Memo }
  | { t: 'rec'; date: string; o: 3; rec: Recording };

// タイムライン：このフォルダの記録を全部、時間の順に1本で並べる。見るだけの画面で、ここからは書かない・録らない。
// 左＝レッスンページで書いた行（先生の名前つきの吹き出し）、右＝自分のメモ・録音。上で曲と期間を絞れる
export default function TimelineScreen() {
  const { data, folder } = useLoadedState();
  const player = usePlayer();
  const [songId, setSongId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('all');
  const [sheet, setSheet] = useState<'song' | 'period' | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const songs = songsOf(data, folder?.id);
  const song = songs.find((s) => s.id === songId) ?? null; // フォルダを切り替えたら絞りは外れる
  const songName = (id: string | null) => (id ? (data.songs.find((s) => s.id === id)?.title ?? '') : '');

  // 期間の始まり（今日から1か月・3か月前）
  let from = '';
  if (period !== 'all') {
    const d = new Date();
    d.setMonth(d.getMonth() - (period === 'm1' ? 1 : 3));
    from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const isSongTopic = (l: Lesson, key: string | null) => {
    const tp = l.topics.find((x) => x.key === key);
    return !!song && tp?.kind === 'song' && tp.songId === song.id;
  };
  const items: Item[] = [];
  for (const l of [...lessonsOf(data, folder?.id)].reverse()) {
    if (!song || l.topics.some((t) => t.kind === 'song' && t.songId === song.id)) items.push({ t: 'lesson', date: l.date, o: 0, lesson: l });
    for (const n of l.learned) if (!song || isSongTopic(l, n.topicKey)) items.push({ t: 'line', date: l.date, o: 1, lesson: l, line: n });
  }
  for (const m of data.memos) if (m.folderId === folder?.id && (!song || m.songId === song.id)) items.push({ t: 'memo', date: m.date, o: 2, memo: m });
  for (const r of [...data.recordings].reverse()) {
    if (r.folderId === folder?.id && r.kind !== 'lesson' && (!song || r.songId === song.id)) items.push({ t: 'rec', date: r.date, o: 3, rec: r });
  }
  const shown = items
    .filter((it) => !from || it.date >= from)
    .map((it, i) => ({ it, i }))
    .sort((a, b) => (a.it.date < b.it.date ? -1 : a.it.date > b.it.date ? 1 : a.it.o - b.it.o || a.i - b.i))
    .map((x) => x.it);
  const lessonRecOf = (id: string) => data.recordings.find((r) => r.kind === 'lesson' && r.lessonId === id);

  // 開いたとき・絞りを変えたときは、いちばん新しいところ（下）を見せる
  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: false }), 50);
    return () => clearTimeout(t);
  }, [songId, period, folder?.id]);

  const rows: React.ReactNode[] = [];
  let lastDate = '';
  let prevKey = '';
  for (const it of shown) {
    if (it.date !== lastDate) {
      lastDate = it.date;
      prevKey = '';
      rows.push(
        <Text key={`d${it.date}`} style={styles.div}>
          {fmtDateLong(it.date)}
        </Text>,
      );
    }
    if (it.t === 'lesson') {
      prevKey = '';
      rows.push(
        <Pressable
          key={`l${it.lesson.id}`}
          onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: it.lesson.id } })}
          style={styles.lmark}>
          <Text style={styles.lmarkText}>{folder?.name}のレッスン</Text>
          <Icon name="chevron" size={11} color={C.muted} />
        </Pressable>,
      );
    } else if (it.t === 'line') {
      // 続けて同じトピックなら、名前の行は省く。曲で絞っているときはトピック名を出さない
      const key = `${it.lesson.id}:${it.line.topicKey ?? ''}`;
      const tp = it.lesson.topics.find((x) => x.key === it.line.topicKey);
      const label = (folder?.teacher || '先生') + (!song && tp ? ` · ${topicLabel(data, tp)}` : '');
      const lr = it.line.at != null ? lessonRecOf(it.lesson.id) : undefined;
      rows.push(
        <View key={`n${it.line.id}`} style={styles.left}>
          {prevKey !== key && (
            <Text style={styles.name} numberOfLines={1}>
              {label}
            </Text>
          )}
          <View style={styles.lb}>
            <Text style={styles.bubbleText}>
              {it.line.text}
              {lr && it.line.at != null && (
                <Text style={styles.at} onPress={() => player.play(lr, it.line.at)} accessibilityLabel={`${fmtDur(it.line.at)}から再生`}>
                  {'  '}▶{fmtDur(it.line.at)}
                </Text>
              )}
            </Text>
          </View>
        </View>,
      );
      prevKey = key;
    } else if (it.t === 'memo') {
      prevKey = '';
      const m = it.memo;
      const lesson = m.lessonId ? data.lessons.find((l) => l.id === m.lessonId) : undefined;
      const where = song ? '' : m.songId ? songName(m.songId) : lesson ? `${fmtDate(lesson.date).replace(/（.）/, '')}のレッスン後` : '';
      rows.push(
        <View key={`m${m.id}`} style={styles.rb}>
          {!!where && <Text style={styles.where}>{where}</Text>}
          <Text style={styles.bubbleText}>{m.text}</Text>
        </View>,
      );
    } else {
      prevKey = '';
      const r = it.rec;
      const on = player.recId === r.id && player.playing;
      const label = (r.kind === 'practice' ? recTitle(data, r) : '曲の録音') + (!song && r.songId ? ` · ${songName(r.songId)}` : '');
      rows.push(
        <View key={`r${r.id}`} style={styles.rrec}>
          <Text style={styles.recLabel} numberOfLines={1}>
            {label}
          </Text>
          {!!r.note && <Text style={styles.recNote}>{r.note}</Text>}
          <View style={styles.recRow}>
            <Pressable onPress={() => (on ? player.toggle() : player.play(r))} style={styles.recPlay} accessibilityLabel={on ? '一時停止' : '再生'}>
              <Icon name={on ? 'pause' : 'play'} size={14} color="#fff" />
            </Pressable>
            <Text style={styles.recDur}>{fmtDur(r.duration)}</Text>
            <View style={styles.wave}>
              {fakeWave(r.id, 16).map((v, i) => (
                <View key={i} style={[styles.waveBar, { height: `${v * 100}%` }]} />
              ))}
            </View>
          </View>
        </View>,
      );
    }
  }

  return (
    <View style={styles.screen}>
      <FolderHeader />
      <View style={styles.filters}>
        <Pressable onPress={() => setSheet('song')} style={[styles.chip, song && styles.chipOn]} accessibilityLabel="曲で絞る">
          {song && <Icon name="note" size={11} color="#6b5200" />}
          <Text style={[styles.chipText, song && styles.chipTextOn]} numberOfLines={1}>
            {song ? song.title : 'すべての曲'}
          </Text>
          <Icon name="down" size={11} color={song ? '#6b5200' : C.muted} />
        </Pressable>
        <Pressable onPress={() => setSheet('period')} style={[styles.chip, period !== 'all' && styles.chipOn]} accessibilityLabel="期間で絞る">
          <Text style={[styles.chipText, period !== 'all' && styles.chipTextOn]}>{PERIOD[period]}</Text>
          <Icon name="down" size={11} color={period !== 'all' ? '#6b5200' : C.muted} />
        </Pressable>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={styles.log}>
        {rows.length ? rows : <Text style={styles.div}>まだ記録がありません</Text>}
      </ScrollView>

      <Sheet visible={sheet === 'song'} onClose={() => setSheet(null)}>
        <Text style={styles.sheetTitle}>曲</Text>
        {[{ id: null as string | null, title: 'すべての曲' }, ...songs].map((s, i) => (
          <Pressable key={s.id ?? 'all'} onPress={() => (setSongId(s.id), setSheet(null))} style={[styles.opt, i > 0 && styles.optBorder]}>
            <Text style={[styles.optText, (song?.id ?? null) === s.id && styles.optOn]}>{s.title}</Text>
          </Pressable>
        ))}
      </Sheet>
      <Sheet visible={sheet === 'period'} onClose={() => setSheet(null)}>
        <Text style={styles.sheetTitle}>期間</Text>
        {(Object.keys(PERIOD) as Period[]).map((k, i) => (
          <Pressable key={k} onPress={() => (setPeriod(k), setSheet(null))} style={[styles.opt, i > 0 && styles.optBorder]}>
            <Text style={[styles.optText, period === k && styles.optOn]}>{PERIOD[k]}</Text>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '60%',
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
  },
  chipOn: { backgroundColor: '#fff3c4', borderColor: '#f0d77a' },
  chipText: { fontSize: 13, fontWeight: '600', color: C.fg, flexShrink: 1 },
  chipTextOn: { color: '#6b5200' },
  log: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 20, gap: 6 },
  div: { alignSelf: 'center', fontSize: 12, color: C.muted, marginTop: 10, marginBottom: 2 },
  lmark: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e3e3e8',
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginVertical: 2,
  },
  lmarkText: { fontSize: 12, fontWeight: '600', color: C.fg },
  left: { alignSelf: 'flex-start', maxWidth: '80%' },
  name: { fontSize: 11, color: C.muted, marginLeft: 10, marginBottom: 2 },
  lb: { backgroundColor: C.card, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 18, borderBottomLeftRadius: 6 },
  bubbleText: { fontSize: 15, lineHeight: 22, color: C.fg },
  at: { fontSize: 12, fontWeight: '600', color: C.accent },
  rb: { alignSelf: 'flex-end', maxWidth: '80%', backgroundColor: '#fff3c4', paddingVertical: 9, paddingHorizontal: 13, borderRadius: 18, borderBottomRightRadius: 6 },
  where: { fontSize: 11, color: '#8a6500', marginBottom: 1 },
  rrec: { alignSelf: 'flex-end', maxWidth: '82%', backgroundColor: C.card, paddingVertical: 8, paddingLeft: 8, paddingRight: 12, borderRadius: 18, borderBottomRightRadius: 6, gap: 4 },
  recLabel: { fontSize: 11, color: C.muted, paddingLeft: 4 },
  recNote: { fontSize: 14, color: C.fg, paddingLeft: 4 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recPlay: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  recDur: { fontSize: 12, color: C.muted, fontVariant: ['tabular-nums'] },
  wave: { width: 90, height: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waveBar: { width: 2, borderRadius: 1, backgroundColor: C.accent },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: C.fg, paddingBottom: 6 },
  opt: { paddingVertical: 12 },
  optBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  optText: { fontSize: 16, color: C.fg },
  optOn: { color: C.accentDark, fontWeight: '700' },
});
