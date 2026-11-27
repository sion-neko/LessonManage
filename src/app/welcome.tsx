import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FolderForm } from '@/components/folder-form';
import { C } from '@/constants/colors';
import { useAppState } from '@/state/app-state';

// 最初の起動：習っているもの（フォルダ）と先生・教室を入れる
export default function WelcomeScreen() {
  const { addFolder } = useAppState();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: insets.top + 80 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>レッスン帳</Text>
        <Text style={styles.lead}>レッスンで学んだこと、やること、個人練の録音をまとめる場所。{'\n'}まずは習っているものをひとつ。</Text>
        <FolderForm
          submitLabel="スタート"
          showExamples
          onSubmit={async (name, teacher) => {
            await addFolder(name, teacher);
            router.replace('/');
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: { paddingHorizontal: 24, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', color: C.fg },
  lead: { marginTop: 10, marginBottom: 28, fontSize: 15, lineHeight: 24, color: C.muted },
});
