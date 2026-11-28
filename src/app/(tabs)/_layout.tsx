import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { C } from '@/constants/colors';
import { useLoadedState } from '@/state/app-state';

export default function TabsLayout() {
  const { data } = useLoadedState();
  // フォルダがひとつもない（最初の起動、全部消した）ときは、初回の画面へ
  if (data.folders.length === 0) return <Redirect href="/welcome" />;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="lessons" />
      <Tabs.Screen name="songs" />
      <Tabs.Screen name="timeline" />
    </Tabs>
  );
}
