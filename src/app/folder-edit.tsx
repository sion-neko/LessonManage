import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FolderForm } from '@/components/folder-form';
import { C } from '@/constants/colors';
import { useLoadedState } from '@/state/app-state';

// フォルダの追加（id なし）と編集（id あり）。編集では、いちばん下から削除できる
export default function FolderEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, addFolder, updateFolder, folderContents, deleteFolder } = useLoadedState();
  const folder = id ? data.folders.find((f) => f.id === id) : undefined;
  const [confirm, setConfirm] = useState<{ lessons: number; songs: number } | null>(null);

  if (id && !folder) return null; // 削除した直後

  if (folder && confirm) {
    // 確かめてから消す。レッスン・曲もまとめて消えるので、件数を見せる
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
        <Stack.Screen options={{ title: `「${folder.name}」を削除` }} />
        <Text style={styles.warn}>
          レッスン{confirm.lessons}件、曲{confirm.songs}曲も消えます。元に戻せません。
        </Text>
        <Pressable
          onPress={async () => {
            await deleteFolder(folder.id);
            router.back();
          }}
          style={({ pressed }) => [styles.danger, pressed && { opacity: 0.6 }]}
          accessibilityRole="button">
          <Text style={styles.dangerText}>削除</Text>
        </Pressable>
        <Pressable onPress={() => setConfirm(null)} style={styles.sub} accessibilityRole="button">
          <Text style={styles.subText}>やめる</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: folder ? 'フォルダの編集' : 'フォルダを追加' }} />
      <FolderForm
        initialName={folder?.name}
        initialTeacher={folder?.teacher}
        submitLabel={folder ? '保存' : '追加'}
        onSubmit={async (name, teacher) => {
          if (folder) await updateFolder(folder.id, name, teacher);
          else await addFolder(name, teacher);
          router.back();
        }}
      />
      {folder && (
        <Pressable onPress={async () => setConfirm(await folderContents(folder.id))} style={styles.sub} accessibilityRole="button">
          <Text style={[styles.subText, { color: C.rec }]}>このフォルダを削除</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: { padding: 16, gap: 10 },
  warn: { fontSize: 15, lineHeight: 24, color: C.muted, marginBottom: 6 },
  danger: { height: 54, borderRadius: 14, backgroundColor: C.rec, alignItems: 'center', justifyContent: 'center' },
  dangerText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  sub: { alignItems: 'center', paddingVertical: 14 },
  subText: { fontSize: 16, color: C.accentDark },
});
