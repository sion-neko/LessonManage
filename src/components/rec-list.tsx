import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/colors';
import type { Recording } from '@/data/types';
import { fmtDate } from '@/lib/date';
import { fmtDur } from '@/state/recorder';
import { Icon } from './icon';
import { NoneYet } from './lesson-parts';

// 録音の一覧（レッスンページの個人練、曲ページの録音で同じ形）。
// 線で区切った行。左に日付、真ん中に一言と曲名など、右に灰色の時間と金色の▶。
// 流すのは▶を押したときだけ（再生は次の区切りで作る）
export function RecList({ recs, sub }: { recs: Recording[]; sub: (r: Recording) => { label: string; song?: boolean } }) {
  if (recs.length === 0) return <NoneYet />;
  const notYet = () => Alert.alert('再生', '再生は次の区切りで作ります。');
  return (
    <View>
      {recs.map((r, i) => {
        const s = sub(r);
        return (
          <View key={r.id} style={[styles.row, i > 0 && styles.border]}>
            <Text style={styles.date}>{fmtDate(r.date).replace(/（.）/, '')}</Text>
            <View style={styles.mid}>
              {!!r.note && (
                <Text style={styles.note} numberOfLines={1}>
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
            <Pressable onPress={notYet} hitSlop={10} accessibilityRole="button" accessibilityLabel="再生">
              <Icon name="play" size={18} color={C.accent} />
            </Pressable>
          </View>
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
