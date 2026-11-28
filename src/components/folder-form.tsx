import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { C } from '@/constants/colors';
import { GoButton } from './ui';

const EXAMPLES = ['バイオリン', 'ボイトレ', 'ピアノ'];

// フォルダの名前と先生・教室を入れる欄。初回の画面と、フォルダの追加・編集で使う
export function FolderForm({
  initialName = '',
  initialTeacher = '',
  submitLabel,
  showExamples,
  onSubmit,
}: {
  initialName?: string;
  initialTeacher?: string;
  submitLabel: string;
  showExamples?: boolean;
  onSubmit: (name: string, teacher: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [teacher, setTeacher] = useState(initialTeacher);
  const [missing, setMissing] = useState(false);
  const submit = () => {
    const n = name.trim();
    if (!n) {
      setMissing(true);
      return;
    }
    onSubmit(n, teacher.trim());
  };
  return (
    <View style={styles.form}>
      <TextInput
        value={name}
        onChangeText={(v) => {
          setName(v);
          setMissing(false);
        }}
        placeholder="例：バイオリン"
        placeholderTextColor={C.muted}
        style={[styles.input, missing && styles.inputMissing]}
        autoFocus={!initialName}
        returnKeyType="next"
        accessibilityLabel="習っているもの"
      />
      {showExamples && (
        <View style={styles.examples}>
          {EXAMPLES.map((e) => (
            <Pressable key={e} onPress={() => setName(e)} style={({ pressed }) => [styles.example, pressed && { backgroundColor: C.hl }]}>
              <Text style={styles.exampleText}>{e}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <TextInput
        value={teacher}
        onChangeText={setTeacher}
        placeholder="先生・教室（なくてもいい）"
        placeholderTextColor={C.muted}
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={submit}
        accessibilityLabel="先生・教室"
      />
      <View style={{ marginTop: 6 }}>
        <GoButton label={submitLabel} onPress={submit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  input: { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 17, color: C.fg },
  inputMissing: { borderWidth: 1, borderColor: C.rec },
  examples: { flexDirection: 'row', gap: 8, marginTop: -2, marginBottom: 4 },
  example: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: C.card },
  exampleText: { fontSize: 14, color: C.accentDark },
});
