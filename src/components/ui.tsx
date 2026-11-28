import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/colors';
import { Icon, type IconName } from './icon';

/** 金色の大きなボタン（「個人練を録音」「最初のレッスン」など） */
export function GoButton({ label, icon, onPress }: { label: string; icon?: IconName; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => (
        <View style={[styles.go, pressed && styles.goPressed]}>
          {icon && <Icon name={icon} size={20} color="#fff" />}
          <Text style={styles.goText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** 中身がないときの白い枠 */
export function Blank({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <View style={styles.blank}>
      <Text style={styles.blankTitle}>{title}</Text>
      <Text style={styles.blankBody}>{body}</Text>
      {children}
    </View>
  );
}

/** 白い角丸の一覧。行は押すとページへ */
export function ListGroup({ children }: { children: ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

export function ListRow({ title, sub, last, onPress }: { title: string; sub?: string; last?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { backgroundColor: C.hl }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {!!sub && (
          <Text style={styles.rowSub} numberOfLines={1}>
            {sub}
          </Text>
        )}
      </View>
      <Icon name="chevron" size={16} color={C.chevron} />
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sec}>{children}</Text>;
}

const styles = StyleSheet.create({
  go: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: 14,
    backgroundColor: C.accent,
    shadowColor: C.accentDark,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  goPressed: { transform: [{ translateY: 4 }], shadowOffset: { width: 0, height: 0 } },
  goText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  blank: { marginTop: 28, marginHorizontal: 16, paddingVertical: 28, paddingHorizontal: 20, borderRadius: 14, backgroundColor: C.card },
  blankTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 6, color: C.fg },
  blankBody: { fontSize: 14, lineHeight: 22, color: C.muted, textAlign: 'center', marginBottom: 18 },
  list: { marginHorizontal: 16, backgroundColor: C.card, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 8 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowTitle: { fontSize: 17, color: C.fg },
  rowSub: { fontSize: 14, color: C.muted, marginTop: 1 },
  sec: { fontSize: 13, color: C.muted, paddingTop: 22, paddingBottom: 7, paddingHorizontal: 32 },
});
