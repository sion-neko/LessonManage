import { ScrollView, StyleSheet, View } from 'react-native';

import { FolderHeader } from '@/components/folder-header';
import { Blank } from '@/components/ui';
import { C } from '@/constants/colors';

export default function TimelineScreen() {
  return (
    <View style={styles.screen}>
      <FolderHeader />
      <ScrollView>
        <Blank title="タイムライン" body="このフォルダの記録を時間の順に並べる画面。後の区切りで作ります。" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: C.bg } });
