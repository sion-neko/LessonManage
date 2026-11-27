import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/colors';

// つまみがすべる切り替え（「まとめ／個人練」など）
export function Segment<K extends string>({ items, value, onChange }: { items: [K, string][]; value: K; onChange: (k: K) => void }) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, items.findIndex(([k]) => k === value));
  const x = useRef(new Animated.Value(index)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: index, duration: 300, useNativeDriver: true }).start();
  }, [index, x]);
  const knobW = width > 0 ? (width - 4) / items.length : 0;
  return (
    <View style={styles.seg} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {knobW > 0 && <Animated.View style={[styles.knob, { width: knobW, transform: [{ translateX: Animated.multiply(x, knobW) }] }]} />}
      {items.map(([k, label]) => (
        <Pressable key={k} style={styles.btn} onPress={() => k !== value && onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: k === value }}>
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: '#e3e3e8', borderRadius: 10, padding: 2 },
  knob: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: 8,
    backgroundColor: C.card,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  btn: { flex: 1, paddingVertical: 6, alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: C.fg },
});
