import { StatusBar } from 'expo-status-bar';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions } from 'react-native';
import { usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, interpolateColor, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { BarContent, BAR_BG } from './play-bar';
import { DARK, PlayerView } from './player-view';

// 再生画面を、ミニプレーヤー（再生バー）から広げて出し、閉じるとミニプレーヤーへ縮めて戻す層。
// 別の画面として下から出すと、ミニプレーヤーと違うところから出てきて気持ち悪いので、
// ミニプレーヤーの位置・大きさから全画面まで、同じ1枚の箱を伸び縮みさせる（音楽アプリのミニプレーヤーと同じ）。
// 中身は縦横比を保ったまま、ミニプレーヤーの幅から全画面まで拡大する（ズームイン・ズームアウト）。
// ミニプレーヤーが出ていないとき（一覧から開いたときなど）は、画面の真ん中から少し小さい状態でふわっと拡大し、縮みながら消える

export type Rect = { x: number; y: number; w: number; h: number };

type SheetState = {
  /** 再生画面が出ているか（広がる途中・縮む途中も含む）。出ている間、本物の再生バーは隠す */
  open: boolean;
  /** 広げる。from は広がり始める場所（再生バーの位置）。なければ画面の下から */
  expand: (from?: Rect | null) => void;
  collapse: () => void;
  /** いま見えている再生バーの位置を測る関数を登録する（縮めて戻す先） */
  registerBar: (measure: () => Promise<Rect | null>) => () => void;
};

const Ctx = createContext<SheetState | null>(null);

const OPEN_MS = 600;
const CLOSE_MS = 380;
const BAR_RADIUS = 14;

export function PlayerSheetProvider({ children }: { children: ReactNode }) {
  const { width: W, height: H } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const bars = useRef<(() => Promise<Rect | null>)[]>([]);

  // progress：0＝再生バーの大きさ、1＝全画面。drag：下に引いている量
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const from = useSharedValue<Rect>({ x: 0, y: 0, w: W, h: H });
  // 1＝ミニプレーヤーから。0＝ミニプレーヤーがなく、真ん中からふわっと出す
  const fromBar = useSharedValue(0);

  const center = useCallback((): Rect => ({ x: W * 0.08, y: H * 0.08, w: W * 0.84, h: H * 0.84 }), [W, H]);
  const setFrom = useCallback(
    (r: Rect | null) => {
      from.value = r ?? center();
      fromBar.value = r ? 1 : 0;
    },
    [from, fromBar, center],
  );

  const expand = useCallback(
    (r?: Rect | null) => {
      setFrom(r ?? null);
      drag.value = 0;
      setOpen(true);
      setExpanded(true);
      progress.value = withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) });
    },
    [setFrom, drag, progress],
  );

  const finishClose = useCallback(() => {
    setOpen(false);
    drag.value = 0;
  }, [drag]);

  // 戻す先：いちばん新しく登録された（＝いま見えている画面の）再生バー
  const measureBar = useCallback(async () => {
    const measure = bars.current[bars.current.length - 1];
    return measure ? await measure() : null;
  }, []);
  // 下に引き始めたときに、戻す先を先に測っておく（指を離した瞬間に止まらず縮み始められるように）
  const target = useRef<Promise<Rect | null> | null>(null);
  const prepare = useCallback(() => {
    target.current = measureBar();
  }, [measureBar]);

  // velocity：下に引いて離したときの指の速さ（px/秒）。勢いを引き継いで縮める
  const collapse = useCallback(
    async (velocity = 0) => {
      setExpanded(false);
      const r = await (target.current ?? measureBar());
      target.current = null;
      setFrom(r);
      const done = (finished?: boolean) => {
        'worklet';
        if (finished) runOnJS(finishClose)();
      };
      if (velocity > 0) {
        // 指を離したあとも勢いのまま吸い込まれるように、バネで縮める（行き過ぎはしない）
        progress.value = withSpring(0, { velocity: -velocity / H, damping: 28, stiffness: 240, overshootClamping: true }, done);
      } else {
        progress.value = withTiming(0, { duration: CLOSE_MS, easing: Easing.inOut(Easing.cubic) }, done);
      }
    },
    [setFrom, progress, finishClose, measureBar, H],
  );

  const close = useCallback(() => collapse(), [collapse]);

  const registerBar = useCallback((m: () => Promise<Rect | null>) => {
    bars.current.push(m);
    return () => {
      bars.current = bars.current.filter((x) => x !== m);
    };
  }, []);

  // Android の戻るで閉じる
  useEffect(() => {
    if (!expanded) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [expanded, close]);

  // 上の黒いところを下に引くと閉じる。少しだけなら元に戻す。
  // 指の動きは画面を描く側（UI スレッド）で追うので、引いている間もなめらかに動く
  const pan = usePanGesture({
    activeOffsetY: 8,
    failOffsetX: [-14, 14],
    onActivate: () => {
      'worklet';
      runOnJS(prepare)();
    },
    onUpdate: (e) => {
      'worklet';
      drag.value = Math.max(0, e.translationY);
    },
    onDeactivate: (e) => {
      'worklet';
      // 120px 引くか、さっと下に払ったら閉じる
      if (e.translationY > 120 || e.velocityY > 800) runOnJS(collapse)(Math.max(0, e.velocityY));
      else drag.value = withSpring(0, { velocity: e.velocityY, damping: 22, stiffness: 260 });
    },
  });

  const box = useAnimatedStyle(() => {
    const p = progress.value;
    const f = from.value;
    return {
      left: interpolate(p, [0, 1], [f.x, 0]),
      top: interpolate(p, [0, 1], [f.y, 0]) + drag.value * p,
      width: interpolate(p, [0, 1], [f.w, W]),
      height: interpolate(p, [0, 1], [f.h, H]),
      borderRadius: interpolate(p, [0, 1], [BAR_RADIUS, 0]) + Math.min(drag.value / 8, 24),
      backgroundColor: fromBar.value ? interpolateColor(p, [0, 0.5], [BAR_BG, DARK]) : DARK,
      // ミニプレーヤーがないときは、ふわっと出して、ふわっと消す
      opacity: fromBar.value ? 1 : interpolate(p, [0, 0.6], [0, 1], 'clamp'),
    };
  });
  // 再生バーの中身はすぐ消し、再生画面の中身は少し遅れて出す（入れ替わりを1枚の箱の中で）
  const mini = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.22], [1, 0], 'clamp') }));
  // 再生画面の中身は、箱の幅に合わせて縦横比を保ったまま縮めておき、全画面まで拡大する
  const full = useAnimatedStyle(() => ({
    opacity: fromBar.value ? interpolate(progress.value, [0.12, 0.6], [0, 1], 'clamp') : 1,
    transform: [{ scale: interpolate(progress.value, [0, 1], [from.value.w / W, 1]) }],
  }));

  const value = useMemo<SheetState>(() => ({ open, expand, collapse: close, registerBar }), [open, expand, close, registerBar]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {open && (
        <Animated.View style={[styles.box, box]}>
          {expanded && <StatusBar style="light" />}
          <Animated.View style={[styles.mini, mini]} pointerEvents="none">
            <BarContent />
          </Animated.View>
          <Animated.View style={[{ width: W, height: H, transformOrigin: 'top left' }, full]} pointerEvents={expanded ? 'auto' : 'none'}>
            <PlayerView onClose={close} gesture={pan} />
          </Animated.View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export function usePlayerSheet() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlayerSheet は PlayerSheetProvider の中で使う');
  return v;
}

const styles = StyleSheet.create({
  box: { position: 'absolute', overflow: 'hidden' },
  mini: { position: 'absolute', top: 0, left: 0, right: 0, height: 58 },
});
