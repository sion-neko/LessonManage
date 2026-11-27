import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/colors';
import { Icon } from './icon';

/** 金色の文字と線の見出し（やること・学んだこと・メモ・録音） */
export function LsHeading({ children }: { children: ReactNode }) {
  return <Text style={styles.h}>{children}</Text>;
}

/** 学んだことの中のトピック見出し。曲は灰色の細い音符の絵を付ける */
export function TopicHeading({ label, song, onPress }: { label: string; song?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.tk}>
      {song && <Icon name="note" size={12} color={C.muted} />}
      <Text style={styles.tkText}>{label}</Text>
    </Pressable>
  );
}

export function NoneYet() {
  return <Text style={styles.none}>まだありません</Text>;
}

/** 画面の下の、録音まわりのボタンを置く場所 */
export function Dock({ children, bottom }: { children: ReactNode; bottom: number }) {
  return <View style={[styles.dock, { paddingBottom: bottom }]}>{children}</View>;
}

const styles = StyleSheet.create({
  h: {
    marginTop: 22,
    marginHorizontal: 20,
    marginBottom: 2,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    color: C.accentDark,
    fontSize: 16,
    fontWeight: '700',
  },
  tk: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 10, paddingHorizontal: 20 },
  tkText: { fontSize: 13, fontWeight: '700', color: '#48484a' },
  none: { paddingVertical: 8, paddingHorizontal: 20, color: C.muted, fontSize: 14 },
  dock: { paddingTop: 14, paddingHorizontal: 16, backgroundColor: C.card },
});
