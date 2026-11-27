import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/colors';
import type { Recording } from '@/data/types';
import { fmtDate } from '@/lib/date';
import { usePlayer } from '@/state/player';
import { fmtDur } from '@/state/recorder';
import { Icon } from './icon';
import { NoneYet } from './lesson-parts';

// 録音の一覧（レッスンページの個人練、曲ページの録音で同じ形）。
// 線で区切った行。左に日付、真ん中に一言と曲名など、右に灰色の時間と金色の▶。
// 流れるのは▶を押したときだけ。行のほかの場所を押すと、流さずに再生画面が開く。
// 流れている行は、左の日付が音の印に、一言が金色に、▶が一時停止に変わる
export function RecList({ recs, sub }: { recs: Recording[]; sub: (r: Recording) => { label: string; song?: boolean } }) {
  const p = usePlayer();
  if (recs.length === 0) return <NoneYet />;
  return (
    <View>
      {recs.map((r, i) => {
        const s = sub(r);
        const playing = p.recId === r.id && p.playing;
        return (
          <Pressable
            key={r.id}
            onPress={() => {
              p.open(r);
              router.push('/player');
            }}
            style={({ pressed }) => [styles.row, i > 0 && styles.border, pressed && { backgroundColor: C.hl }]}>
            {playing ? (
              <View style={styles.date}>
                <Icon name="eq" size={16} color={C.accent} />
              </View>
            ) : (
              <Text style={styles.date}>{fmtDate(r.date).replace(/（.）/, '')}</Text>
            )}
            <View style={styles.mid}>
              {!!r.note && (
                <Text style={[styles.note, playing && { color: C.accentDark }]} numberOfLines={1}>
                  {r.note}
                </Text>
              )}
              <View style={styles.subRow}>
                {s.song && <Icon name="note" size={11} color={C.muted} />}
                <Text style={styles.sub} numberOfLines={1}>
                  {s.label}
                </Text>
              </View>
            </View>
            <Text style={styles.dur}>{fmtDur(r.duration)}</Text>
            <Pressable
              onPress={() => (playing ? p.toggle() : p.play(r))}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={playing ? '一時停止' : '再生'}>
              <Icon name={playing ? 'pause' : 'play'} size={18} color={C.accent} />
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 20 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  date: { width: 42, fontSize: 14, color: C.muted, fontVariant: ['tabular-nums'] },
  mid: { flex: 1, minWidth: 0 },
  note: { fontSize: 15, color: C.fg },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sub: { fontSize: 13, color: C.muted, flexShrink: 1 },
  dur: { fontSize: 13, color: C.muted, fontVariant: ['tabular-nums'] },
});
