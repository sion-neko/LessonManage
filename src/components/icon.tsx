import { SymbolView } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

// iOS は SF Symbols、Android と Web は Material Symbols
const NAMES = {
  home: { ios: 'house', android: 'home', web: 'home' },
  list: { ios: 'list.bullet', android: 'list', web: 'list' },
  note: { ios: 'music.note', android: 'music_note', web: 'music_note' },
  timeline: { ios: 'text.bubble', android: 'forum', web: 'forum' },
  more: { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' },
  down: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  pen: { ios: 'pencil', android: 'edit', web: 'edit' },
  gear: { ios: 'gearshape', android: 'settings', web: 'settings' },
  mic: { ios: 'mic.fill', android: 'mic', web: 'mic' },
} as const;

export type IconName = keyof typeof NAMES;

export function Icon({
  name,
  size = 22,
  color,
  style,
}: {
  name: IconName;
  size?: number;
  color: ColorValue;
  style?: StyleProp<ViewStyle>;
}) {
  return <SymbolView name={NAMES[name]} size={size} tintColor={color} style={style} />;
}
