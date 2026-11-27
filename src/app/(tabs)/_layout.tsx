import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { C } from '@/constants/colors';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="lessons" />
      <Tabs.Screen name="songs" />
      <Tabs.Screen name="timeline" />
    </Tabs>
  );
}
