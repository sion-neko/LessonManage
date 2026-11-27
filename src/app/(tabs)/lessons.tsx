import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FolderHeader } from '@/components/folder-header';
import { Icon } from '@/components/icon';
import { Blank, ListGroup, ListRow, SectionLabel } from '@/components/ui';
import { C } from '@/constants/colors';
import { fmtDateLong } from '@/lib/date';
import { lessonsOf, useLoadedState } from '@/state/app-state';

export default function LessonsScreen() {
  const { data, folder, addLesson } = useLoadedState();
  const lessons = lessonsOf(data, folder?.id);
  const newLesson = async () => {
    if (!folder) return;
    const id = await addLesson(folder.id);
    router.push({ pathname: '/lesson/[id]', params: { id } });
  };
  return (
    <View style={styles.screen}>
      <FolderHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {lessons.length === 0 ? (
          <Blank title="レッスンはまだありません" body="右下の＋で、今日のレッスンを作れます。" />
        ) : (
          <>
            <SectionLabel>{folder?.teacher}</SectionLabel>
            <ListGroup>
              {lessons.map((l, i) => (
                <ListRow
                  key={l.id}
                  title={fmtDateLong(l.date)}
                  sub={l.learned[0]?.text ?? '（まだ何も書いていない）'}
                  last={i === lessons.length - 1}
                  onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: l.id } })}
                />
              ))}
            </ListGroup>
          </>
        )}
      </ScrollView>
      <Pressable onPress={newLesson} accessibilityRole="button" accessibilityLabel="新しいレッスン" style={styles.plusWrap}>
        {({ pressed }) => (
          <View style={[styles.plus, pressed && styles.plusPressed]}>
            <Icon name="plus" size={26} color="#fff" />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  plusWrap: { position: 'absolute', right: 18, bottom: 18 },
  plus: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accentDark,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  plusPressed: { transform: [{ translateY: 4 }], shadowOffset: { width: 0, height: 0 } },
});
