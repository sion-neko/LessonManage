import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/colors';
import type { Memo } from '@/data/types';
import { fmtDate, todayYmd } from '@/lib/date';
import { LineList } from './line-list';

// メモ欄（レッスン後のメモ・曲の自分のメモ）：日付ごとにまとめ、新しい日が上。
// 今日の見出しはいつも出し、その下の余白をタップして書く。前の日のメモはタップで直せる
export function MemoDays({
  memos,
  onAdd,
  onEdit,
  onDelete,
  foldAfter,
}: {
  /** この日数まで見せて、残りは「…もっと見る」で開く（曲ページ） */
  foldAfter?: number;
  memos: Memo[];
  onAdd: (text: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) {
  const today = todayYmd();
  const days: { date: string; items: Memo[] }[] = [];
  for (const m of [...memos].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))) {
    const last = days[days.length - 1];
    if (last && last.date === m.date) last.items.push(m);
    else days.push({ date: m.date, items: [m] });
  }
  if (days[0]?.date !== today) days.unshift({ date: today, items: [] });
  const [open, setOpen] = useState(false);
  const folded = foldAfter != null && !open && days.length > foldAfter;
  const visible = folded ? days.slice(0, foldAfter) : days;

  return (
    <View>
      {visible.map((d) => {
        const isToday = d.date === today;
        return (
          <View key={d.date}>
            <Text style={[styles.day, isToday && { color: C.accentDark }]}>
              {fmtDate(d.date)}
              {isToday ? ' 今日' : ''}
            </Text>
            <LineList items={d.items} variant="bullet" canAdd={isToday} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
          </View>
        );
      })}
      {foldAfter != null && days.length > foldAfter && (
        <FoldButton open={open} rest={days.length - foldAfter} onPress={() => setOpen(!open)} />
      )}
    </View>
  );
}

/** 「…もっと見る（ほか2日）」と「閉じる」 */
export function FoldButton({ open, rest, onPress }: { open: boolean; rest: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 20, paddingVertical: 8 }} hitSlop={4}>
      <Text style={{ fontSize: 13, color: C.muted }}>{open ? '閉じる' : `…もっと見る（ほか${rest}日）`}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  day: { paddingTop: 10, paddingHorizontal: 20, fontSize: 13, fontWeight: '700', color: '#48484a' },
});
