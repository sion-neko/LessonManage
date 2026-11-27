import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { FolderHeader } from '@/components/folder-header';
import { Blank, ListGroup, ListRow, SectionLabel } from '@/components/ui';
import { C } from '@/constants/colors';
import { fmtDateLong } from '@/lib/date';
import { lessonsOf, useLoadedState } from '@/state/app-state';

export default function LessonsScreen() {
  const { data, folder } = useLoadedState();
  const lessons = lessonsOf(data, folder?.id);
  return (
    <View style={styles.screen}>
      <FolderHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {lessons.length === 0 ? (
          <Blank title="レッスンはまだありません" body="レッスンの作成は後の区切りで作ります。" />
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
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: C.bg } });
