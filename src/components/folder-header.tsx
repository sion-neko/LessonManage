import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/colors';
import { useAppState } from '@/state/app-state';
import { Icon } from './icon';
import { PopupMenu, type Anchor, type MenuItem } from './popup-menu';

// 各タブの左上：今のフォルダの名前を見出しに。押すと真下に切り替えのメニュー。
// 右上の•••：このフォルダを編集・設定
export function FolderHeader() {
  const { data, folder, setFolderId } = useAppState();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const titleRef = useRef<ComponentRef<typeof Pressable>>(null);
  const moreRef = useRef<ComponentRef<typeof Pressable>>(null);
  const [menu, setMenu] = useState<'folders' | 'more' | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const open = (which: 'folders' | 'more') => {
    const ref = which === 'folders' ? titleRef : moreRef;
    ref.current?.measureInWindow((x, y, w, h) => {
      setAnchor(which === 'folders' ? { top: y + h + 6, left: x } : { top: y + h + 6, right: width - (x + w) });
      setMenu(which);
    });
  };

  const notYet = (what: string) => Alert.alert(what, '次の区切り（データの保存）で作ります。');

  const folderItems: MenuItem[] = [
    ...data.folders.map((f) => ({
      key: f.id,
      label: f.name,
      checked: f.id === folder?.id,
      onPress: () => setFolderId(f.id),
    })),
    { key: 'add', label: 'フォルダを追加', icon: 'plus', accent: true, onPress: () => notYet('フォルダを追加') },
  ];
  const moreItems: MenuItem[] = [
    { key: 'edit', label: 'このフォルダを編集', icon: 'pen', onPress: () => notYet('このフォルダを編集') },
    { key: 'settings', label: '設定', icon: 'gear', onPress: () => router.push('/settings') },
  ];

  return (
    <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
      <Pressable ref={titleRef} onPress={() => open('folders')} style={styles.title} accessibilityRole="button" accessibilityLabel="フォルダを切り替える">
        <Text style={styles.titleText} numberOfLines={1}>
          {folder?.name ?? ''}
        </Text>
        <Icon name="down" size={18} color={C.muted} style={{ marginTop: 3 }} />
      </Pressable>
      <Pressable ref={moreRef} onPress={() => open('more')} style={styles.more} accessibilityRole="button" accessibilityLabel="そのほか">
        <Icon name="more" size={22} color={C.accent} />
      </Pressable>
      <PopupMenu
        visible={menu !== null}
        anchor={anchor}
        items={menu === 'folders' ? folderItems : moreItems}
        onClose={() => setMenu(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  title: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 4 },
  titleText: { flexShrink: 1, fontSize: 26, fontWeight: '800', color: C.fg },
  more: { marginLeft: 'auto', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
