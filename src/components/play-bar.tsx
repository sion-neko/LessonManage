import { useIsFocused } from 'expo-router';
import { useEffect, useRef, type ComponentRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/colors';
import { useLoadedState } from '@/state/app-state';
import { recSub, recTitle, usePlayer } from '@/state/player';
import { fmtDur, useRecorder } from '@/state/recorder';
import { Icon } from './icon';
import { usePlayerSheet, type Rect } from './player-sheet';
import { GoButton } from './ui';

export const PLAY_BAR_HEIGHT = 58;
export const BAR_BG = '#fbfbfd';

/** 再生バーを出すか：何かを流したあとで、録音中でないとき */
export function usePlayBarVisible() {
  const p = usePlayer();
  const rec = useRecorder();
  return p.barShown && !!p.recId && !rec.target;
}

// 画面の下に出る小さな明るい帯。押すと、その場から再生画面に広がる（player-sheet.tsx）。
// 下にスワイプするか×で閉じる（再生も止まる）
export function PlayBar({ style }: { style?: object }) {
  const { data } = useLoadedState();
  const p = usePlayer();
  const sheet = usePlayerSheet();
  const visible = usePlayBarVisible();
  const focused = useIsFocused();
  const ref = useRef<ComponentRef<typeof Animated.View>>(null);
  const dy = useRef(new Animated.Value(0)).current;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => dy.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 36) {
          Animated.timing(dy, { toValue: 120, duration: 200, useNativeDriver: true }).start(() => {
            pClose.current();
            dy.setValue(0);
          });
        } else Animated.spring(dy, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;
  const pClose = useRef(p.close);
  pClose.current = p.close;

  const r = visible ? data.recordings.find((x) => x.id === p.recId) : undefined;

  // 再生画面を縮めて戻す先として、見えている画面の再生バーの位置を知らせる
  const shown = !!r;
  const { registerBar } = sheet;
  useEffect(() => {
    if (!focused || !shown) return;
    return registerBar(() => measure(ref.current));
  }, [focused, shown, registerBar]);

  if (!r) return null;
  const openSheet = async () => sheet.expand(await measure(ref.current));
  return (
    <Animated.View
      ref={ref}
      style={[styles.bar, { transform: [{ translateY: dy }] }, sheet.open && { opacity: 0 }, style]}
      {...pan.panHandlers}>
      <BarContent onOpen={openSheet} />
    </Animated.View>
  );
}

function measure(v: ComponentRef<typeof Animated.View> | null): Promise<Rect | null> {
  return new Promise((res) => {
    if (!v) return res(null);
    v.measureInWindow((x, y, w, h) => res(w > 0 ? { x, y, w, h } : null));
  });
}

/** 再生バーの中身。再生バーと、再生画面が広がり始め・縮み終わりのところで同じものを出す */
export function BarContent({ onOpen }: { onOpen?: () => void }) {
  const { data } = useLoadedState();
  const p = usePlayer();
  const r = data.recordings.find((x) => x.id === p.recId);
  if (!r) return null;
  const dur = p.duration || r.duration;
  const pct = dur > 0 ? Math.min(1, p.position / dur) : 0;
  return (
    <View style={styles.inner}>
      <Pressable style={styles.body} onPress={onOpen} accessibilityLabel="再生画面を開く">
        <Text style={styles.title} numberOfLines={1}>
          {recTitle(data, r)}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {recSub(data, r, p.position)}・{fmtDur(p.position)} / {fmtDur(dur)}
        </Text>
      </Pressable>
      <Pressable onPress={p.toggle} hitSlop={6} style={styles.btn} accessibilityLabel={p.playing ? '一時停止' : '再生'}>
        <Icon name={p.playing ? 'pause' : 'play'} size={22} color={C.fg} />
      </Pressable>
      <Pressable onPress={() => p.skip(15)} hitSlop={6} style={styles.btn} accessibilityLabel="15秒進む">
        <Icon name="fwd15" size={22} color={C.fg} />
      </Pressable>
      <Pressable onPress={p.close} hitSlop={6} style={styles.btn} accessibilityLabel="再生バーを閉じる">
        <Icon name="close" size={18} color={C.muted} />
      </Pressable>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

// 画面の下の、録音のボタンと再生バーの置き方。
// shrink：再生バーが出ている間は、録音ボタンを丸いマイクに縮めて再生バーの左に並べる（ホーム・個人練・曲の録音）。
// そうでないときは、再生バーを録音ボタンの上に出す
export function RecordDock({ label, onRecord, shrink, bottom }: { label?: string; onRecord?: () => void; shrink?: boolean; bottom: number }) {
  const barVisible = usePlayBarVisible();
  if (!onRecord && !barVisible) return null;
  return (
    <View style={[styles.dock, { paddingBottom: bottom }]}>
      {barVisible && shrink && onRecord ? (
        <View style={styles.row}>
          <Pressable onPress={onRecord} accessibilityRole="button" accessibilityLabel={label}>
            {({ pressed }) => (
              <View style={[styles.mic, pressed && { transform: [{ translateY: 3 }], shadowOffset: { width: 0, height: 0 } }]}>
                <Icon name="mic" size={24} color="#fff" />
              </View>
            )}
          </Pressable>
          <PlayBar style={{ flex: 1 }} />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {barVisible && <PlayBar />}
          {onRecord && label && <GoButton label={label} icon="mic" onPress={onRecord} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: PLAY_BAR_HEIGHT,
    borderRadius: 14,
    backgroundColor: BAR_BG,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    overflow: 'hidden',
  },
  inner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 14, paddingRight: 6 },
  body: { flex: 1, minWidth: 0, justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: C.fg },
  sub: { fontSize: 12, color: C.muted, fontVariant: ['tabular-nums'] },
  btn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: C.line },
  fill: { height: 2, backgroundColor: C.accent },
  dock: { paddingTop: 10, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mic: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accentDark,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});
