import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { FolderHeader } from '@/components/folder-header';
import { Blank, ListGroup, ListRow, SectionLabel } from '@/components/ui';
import { C } from '@/constants/colors';
import { songsOf, useLoadedState } from '@/state/app-state';

export default function SongsScreen() {
  const { data, folder } = useLoadedState();
  const songs = songsOf(data, folder?.id);
  return (
    <View style={styles.screen}>
      <FolderHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {songs.length === 0 ? (
          <Blank title="曲はまだありません" body="レッスンページのトピックの「＋ 追加」から足せます。" />
        ) : (
          <>
            <SectionLabel>曲</SectionLabel>
            <ListGroup>
              {songs.map((s, i) => (
                <ListRow
                  key={s.id}
                  title={s.title}
                  sub={s.sub}
                  last={i === songs.length - 1}
                  onPress={() => router.push({ pathname: '/song/[id]', params: { id: s.id } })}
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
