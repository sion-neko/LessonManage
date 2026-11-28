import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/colors';

// 下から出るシート。外（暗いところ）を押すと閉じる
// 暗い背景ごと下からせり上がるとださいので、背景はその場でふわっと暗くし、シートだけを下から出す
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;
  // 閉じるときは動き終わるまで Modal を残す
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(anim, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[styles.bg, { opacity: anim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="閉じる" />
        </Animated.View>
        <Animated.View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 10, transform: [{ translateY }] }]}>
          <View style={styles.grip} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20 }}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  bg: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  sheet: { maxHeight: '88%', backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 8 },
  grip: { width: 36, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: 'center', marginBottom: 14 },
});
