import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/colors';

// 設定：今は中身がなく、入れる予定の項目を薄く並べておく（docs/requirements.md「設定」）
const PLANNED = ['このアプリについて（バージョン・問い合わせ）', 'ほかの録音の取り込み', '再生の速さ（いつもの速さ）'];

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Text style={styles.soon}>準備中。今後ここに入る予定のもの</Text>
      {PLANNED.map((p) => (
        <View key={p} style={styles.plan}>
          <Text style={styles.planText}>{p}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  soon: { marginBottom: 4, fontSize: 13, color: C.muted },
  plan: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14, backgroundColor: C.card },
  planText: { fontSize: 15, color: '#aeaeb2' },
});
