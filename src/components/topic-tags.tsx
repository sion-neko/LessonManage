import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';

import { C } from '@/constants/colors';

const LINE = 20;
const GAP = 14;

export type Tag = { key: string; label: string };

// 日付の下のトピック。「#ユーモレスク」のようなハッシュタグで並べる。
// ふだんは2行まで。収まらないときは2行目の終わりに「…もっと見る」、開くと全部と「＋ 追加」、その下に「閉じる」
export function TopicTags({ tags, onTap, onAdd }: { tags: Tag[]; onTap: (key: string) => void; onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(0);
  const addLabel = tags.length ? '＋ 追加' : '＋ トピック';
  // 並びが変わったら測り直す（Web は大きさが変わらないと位置の知らせが来ないため、測る並びごと作り直す）
  const sig = `${width}|${addLabel}|` + tags.map((t) => t.key + '\u0000' + t.label).join('\u0001');
  const [measure, setMeasure] = useState<{ sig: string; boxes: Record<string, LayoutRectangle> }>({ sig: '', boxes: {} });
  const boxes = measure.sig === sig ? measure.boxes : {};
  const put = (k: string, l: LayoutRectangle) =>
    setMeasure((m) => (m.sig === sig ? { sig, boxes: { ...m.boxes, [k]: l } } : { sig, boxes: { [k]: l } }));

  // 全部を並べたとき、2行に収まるか。収まらなければ、2行目の終わりに「…もっと見る」が入るまで後ろを削る
  const measured = width > 0 && tags.every((t) => boxes[t.key]) && boxes.__add && boxes.__more;
  let visible = tags;
  let fold = false;
  if (measured && !open) {
    const row = (b: LayoutRectangle) => Math.round(b.y / LINE);
    if (row(boxes.__add) > 1) {
      fold = true;
      const n = tags.filter((t) => row(boxes[t.key]) <= 1).length;
      let k = n;
      while (k > 1) {
        const last = boxes[tags[k - 1].key];
        if (row(last) <= 1 && last.x + last.width + GAP + boxes.__more.width <= width) break;
        k--;
      }
      visible = tags.slice(0, k);
    }
  }

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {/* 幅を測るための見えない並び */}
      <View key={sig} style={[styles.tags, styles.measure]} pointerEvents="none" aria-hidden>
        {tags.map((t) => (
          <Text key={t.key} style={styles.tag} onLayout={(e) => put(t.key, e.nativeEvent.layout)}>
            #{t.label}
          </Text>
        ))}
        <Text style={styles.sub} onLayout={(e) => put('__add', e.nativeEvent.layout)}>
          {addLabel}
        </Text>
        <Text style={styles.sub} onLayout={(e) => put('__more', e.nativeEvent.layout)}>
          …もっと見る
        </Text>
      </View>
      <View style={[styles.tags, !measured && { opacity: 0 }]}>
        {visible.map((t) => (
          <Pressable key={t.key} onPress={() => onTap(t.key)} hitSlop={4}>
            <Text style={styles.tag}>#{t.label}</Text>
          </Pressable>
        ))}
        {fold ? (
          <Pressable onPress={() => setOpen(true)} hitSlop={4}>
            <Text style={styles.sub}>…もっと見る</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onAdd} hitSlop={4}>
            <Text style={styles.sub}>{addLabel}</Text>
          </Pressable>
        )}
      </View>
      {open && (
        <Pressable onPress={() => setOpen(false)} style={{ alignSelf: 'flex-start', marginTop: 2 }} hitSlop={4}>
          <Text style={styles.close}>閉じる</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 10, paddingHorizontal: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', columnGap: GAP },
  measure: { position: 'absolute', top: 10, left: 20, right: 20, opacity: 0 },
  tag: { fontSize: 12, lineHeight: LINE, letterSpacing: 0.24, color: C.topic },
  sub: { fontSize: 12, lineHeight: LINE, color: C.muted },
  close: { fontSize: 11, lineHeight: 18, color: C.muted },
});
