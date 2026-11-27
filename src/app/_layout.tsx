import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { C } from '@/constants/colors';
import { AppStateProvider } from '@/state/app-state';

export default function RootLayout() {
  return (
    <AppStateProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: C.bg },
          headerTintColor: C.accent,
          headerBackTitle: '戻る',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: C.card },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lesson/[id]" options={{ title: '' }} />
        <Stack.Screen name="song/[id]" options={{ title: '' }} />
        <Stack.Screen name="settings" options={{ title: '設定', presentation: 'formSheet', sheetAllowedDetents: [0.6, 1] }} />
      </Stack>
    </AppStateProvider>
  );
}
