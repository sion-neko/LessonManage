import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/colors';
import { Icon, type IconName } from './icon';
import { PlayBar } from './play-bar';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'ホーム', icon: 'home' },
  lessons: { label: 'レッスン', icon: 'list' },
  songs: { label: '曲の記録', icon: 'note' },
  timeline: { label: 'タイムライン', icon: 'timeline' },
};

// 下のタブ。再生バーをこの上に載せるため、自前で描く
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // 再生バーは下のタブの上に出す。ホームは録音ボタンと並べるので、ホームの画面の中で出す
  const onHome = state.routes[state.index]?.name === 'index';
  return (
    <View>
      {!onHome && (
        <View style={styles.playWrap} pointerEvents="box-none">
          <PlayBar />
        </View>
      )}
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {state.routes.map((route, i) => {
          const t = TABS[route.name];
          if (!t) return null;
          const on = state.index === i;
          const color = on ? C.accent : C.muted;
          return (
            <Pressable
              key={route.key}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!on && !e.defaultPrevented) navigateToTab(route.key);
              }}>
              <Icon name={t.icon} size={24} color={color} />
              <Text style={[styles.label, { color }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    backgroundColor: C.tabBar,
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  playWrap: { paddingHorizontal: 12, paddingBottom: 8 },
  label: { fontSize: 10 },
});
