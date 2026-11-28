import { useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/colors';
import { Icon, type IconName } from './icon';

export type MenuItem = {
  key: string;
  label: string;
  icon?: IconName;
  /** チェックを付ける（今のフォルダ） */
  checked?: boolean;
  /** 金色の文字（「＋ フォルダを追加」） */
  accent?: boolean;
  onPress: () => void;
};

export type Anchor = { top: number; left?: number; right?: number };

// 見出しや•••の真下に開く小さなメニュー。外を押すと閉じる
// 押した項目は、メニューが消えきってから動かす（消える前に次の画面やシートを出すと、iOS がメニューを下へずらして片付けてしまう）
export function PopupMenu({
  visible,
  anchor,
  items,
  onClose,
}: {
  visible: boolean;
  anchor: Anchor | null;
  items: MenuItem[];
  onClose: () => void;
}) {
  const pending = useRef<(() => void) | null>(null);
  const runPending = () => {
    const f = pending.current;
    pending.current = null;
    f?.();
  };
  return (
    <Modal visible={visible && !!anchor} transparent animationType="fade" onRequestClose={onClose} onDismiss={runPending}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="メニューを閉じる" />
      {anchor && (
        <View style={[styles.menu, { top: anchor.top, left: anchor.left, right: anchor.right }]}>
          {items.map((it, i) => (
            <Pressable
              key={it.key}
              onPress={() => {
                pending.current = it.onPress;
                onClose();
                // onDismiss は iOS だけ
                if (Platform.OS !== 'ios') runPending();
              }}
              style={({ pressed }) => [styles.row, i > 0 && styles.border, pressed && { backgroundColor: C.hl }]}>
              <View style={styles.ck}>
                {it.checked ? (
                  <Icon name="check" size={16} color={C.accent} />
                ) : it.icon ? (
                  <Icon name={it.icon} size={16} color={it.accent ? C.accentDark : C.accent} />
                ) : null}
              </View>
              <Text style={[styles.label, it.accent && { color: C.accentDark }]}>{it.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    minWidth: 230,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingLeft: 12, paddingRight: 16 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  ck: { width: 20, alignItems: 'center' },
  label: { fontSize: 16, color: C.fg },
});
