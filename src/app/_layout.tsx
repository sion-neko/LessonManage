import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { C } from '@/constants/colors';
import { migrate } from '@/db/schema';
import { AppStateProvider, useAppState } from '@/state/app-state';
import { PlayerProvider } from '@/state/player';
import { RecorderProvider } from '@/state/recorder';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="lessonmanage.db" onInit={migrate}>
      <AppStateProvider>
        <StatusBar style="dark" />
        <WhenLoaded>
          <PlayerProvider>
            <RecorderProvider>
              <Stack
                screenOptions={{
                  contentStyle: { backgroundColor: C.bg },
                  headerTintColor: C.accent,
                  headerBackTitle: '戻る',
                  headerShadowVisible: false,
                  headerStyle: { backgroundColor: C.card },
                  headerTitleStyle: { color: C.fg },
                }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="welcome"
                  options={{
                    headerShown: false,
                    gestureEnabled: false,
                    animation: 'fade',
                  }}
                />
                <Stack.Screen name="lesson/[id]" options={{ title: '' }} />
                <Stack.Screen name="song/[id]" options={{ title: '' }} />
                <Stack.Screen
                  name="folder-edit"
                  options={{
                    presentation: 'formSheet',
                    sheetAllowedDetents: [0.6, 1],
                  }}
                />
                <Stack.Screen
                  name="settings"
                  options={{
                    title: '設定',
                    presentation: 'formSheet',
                    sheetAllowedDetents: [0.6, 1],
                  }}
                />
                <Stack.Screen
                  name="recording"
                  options={{
                    headerShown: false,
                    presentation: 'fullScreenModal',
                    gestureEnabled: false,
                  }}
                />
                <Stack.Screen
                  name="player"
                  options={{
                    headerShown: false,
                    presentation: 'fullScreenModal',
                  }}
                />
              </Stack>
            </RecorderProvider>
          </PlayerProvider>
        </WhenLoaded>
      </AppStateProvider>
    </SQLiteProvider>
  );
}

// データを読み終わるまで画面を出さない（一瞬「レッスンはまだありません」が見えないように）
function WhenLoaded({ children }: { children: ReactNode }) {
  const { data } = useAppState();
  if (!data) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return children;
}
