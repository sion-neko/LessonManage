import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { C } from '@/constants/colors';
import { fmtDur } from '@/state/recorder';

export type EditableItem = { id: string; text: string; at?: number };

// 1行1項目の箇条書き。
// - いちばん下の余白をタップすると、そこに1行書ける。Enter で同じ場所に続けて書ける
// - 書いた行はタップで直せる。中身を空にすると消える
// - 何も書いていないときは、薄く「タップして書く」
export function LineList({
  items,
  variant,
  canAdd = true,
  onAdd,
  onEdit,
  onDelete,
  atStyle = 'saved',
}: {
  items: EditableItem[];
  /** homework＝やること（太字・点なし）、bullet＝学んだこと・メモ（灰色の小さな丸） */
  variant: 'homework' | 'bullet';
  canAdd?: boolean;
  onAdd: (text: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  /** 行の時間（▶12:40）の見せ方。live＝録音中に書いたばかり（赤）、saved＝録音あり（金色の▶） */
  atStyle?: 'live' | 'saved';
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const hw = variant === 'homework';
  return (
    <View>
      {items.map((it) =>
        editing === it.id ? (
          <EditRow
            key={it.id}
            hw={hw}
            initial={it.text}
            onDone={(v) => {
              setEditing(null);
              if (!v) onDelete(it.id);
              else if (v !== it.text) onEdit(it.id, v);
            }}
          />
        ) : (
          <Pressable key={it.id} onPress={() => setEditing(it.id)} style={styles.row} accessibilityHint="タップで直す">
            {!hw && <Dot />}
            <Text style={[styles.text, hw && styles.hwText]}>{it.text}</Text>
            {it.at != null && <Text style={[styles.at, atStyle === 'live' && { color: C.rec }]}>{atStyle === 'saved' ? '▶' : ''}{fmtDur(it.at)}</Text>}
          </Pressable>
        ),
      )}
      {canAdd &&
        (adding ? (
          <AddRow hw={hw} onSubmit={onAdd} onClose={() => setAdding(false)} />
        ) : (
          <Pressable onPress={() => setAdding(true)} style={({ pressed }) => [styles.gap, pressed && { backgroundColor: '#fffbea' }]} accessibilityLabel="ここに書く">
            {items.length === 0 && <Text style={styles.placeholder}>タップして書く</Text>}
          </Pressable>
        ))}
    </View>
  );
}

function Dot() {
  return (
    <View style={styles.dotBox}>
      <View style={styles.dot} />
    </View>
  );
}

function EditRow({ hw, initial, onDone }: { hw: boolean; initial: string; onDone: (v: string) => void }) {
  const [v, setV] = useState(initial);
  // Enter と、そのあとのフォーカスが外れたときの2回呼ばれるので、1回だけにする
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone(v.trim());
  };
  return (
    <View style={[styles.row, styles.inl]}>
      {!hw && <Dot />}
      <TextInput
        value={v}
        onChangeText={setV}
        autoFocus
        multiline={false}
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={finish}
        onBlur={finish}
        style={[styles.text, styles.input, hw && styles.hwText]}
      />
    </View>
  );
}

// 新しい行を書く欄。Enter で確定し、空の欄のまま続けて書ける。外を押すと（空でなければ確定して）閉じる
function AddRow({ hw, onSubmit, onClose }: { hw: boolean; onSubmit: (v: string) => void; onClose: () => void }) {
  const [v, setV] = useState('');
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  // Web では Enter のあとに必ずフォーカスが外れるので、その直後の外れは「閉じる」にしないで、欄に戻す
  const keepOpen = useRef(false);
  return (
    <View style={[styles.row, styles.inl]}>
      {!hw && <Dot />}
      <TextInput
        ref={input}
        value={v}
        onChangeText={setV}
        autoFocus
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => {
          const t = v.trim();
          if (!t) {
            onClose();
            return;
          }
          onSubmit(t);
          setV('');
          keepOpen.current = true;
          setTimeout(() => {
            input.current?.focus();
            keepOpen.current = false;
          }, 30);
        }}
        onBlur={() => {
          if (keepOpen.current) return;
          const t = v.trim();
          if (t) onSubmit(t);
          onClose();
        }}
        style={[styles.text, styles.input, hw && styles.hwText]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5, paddingHorizontal: 20 },
  inl: { backgroundColor: '#fff7d6' },
  text: { flex: 1, fontSize: 16, lineHeight: 25, color: C.fg },
  hwText: { fontSize: 17, fontWeight: '700' },
  input: { padding: 0, margin: 0, minHeight: 25 },
  dotBox: { width: 20, height: 25, marginLeft: -7, marginRight: 4, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#aeaeb2' },
  gap: { minHeight: 30, paddingVertical: 4, paddingHorizontal: 20, justifyContent: 'center' },
  placeholder: { color: C.chevron, fontSize: 14 },
  at: { marginLeft: 6, fontSize: 12, lineHeight: 25, fontWeight: '600', color: C.accent, fontVariant: ['tabular-nums'] },
});
