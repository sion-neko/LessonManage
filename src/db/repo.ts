import type { SQLiteDatabase } from 'expo-sqlite';

import type { AppData, Folder, Lesson, Line, Song, Topic } from '@/data/types';
import { newId } from '@/lib/id';

// SQLite とアプリのデータの形の行き来。画面からは state/app-state.tsx を通して使う

type LessonRow = { id: string; folder_id: string; date: string };
type TopicRow = { lesson_id: string; key: string; song_id: string | null; label: string | null };
type LineRow = { id: string; lesson_id: string; kind: 'homework' | 'learned'; topic_key: string | null; text: string; at: number | null };

/** 全部読む。量が増えて重くなったら、フォルダごとに読むように変える */
export async function loadAll(db: SQLiteDatabase): Promise<AppData> {
  const folders = await db.getAllAsync<Folder>('SELECT id, name, teacher FROM folders ORDER BY created_at');
  const songs = await db.getAllAsync<Song>('SELECT id, folder_id AS folderId, title, sub FROM songs ORDER BY created_at');
  const lessonRows = await db.getAllAsync<LessonRow>('SELECT id, folder_id, date FROM lessons ORDER BY date DESC, created_at DESC');
  const topicRows = await db.getAllAsync<TopicRow>('SELECT lesson_id, key, song_id, label FROM lesson_topics ORDER BY pos');
  const lineRows = await db.getAllAsync<LineRow>('SELECT id, lesson_id, kind, topic_key, text, at FROM lines ORDER BY pos');

  const lessons: Lesson[] = lessonRows.map((r) => ({
    id: r.id,
    folderId: r.folder_id,
    date: r.date,
    topics: [],
    homework: [],
    learned: [],
  }));
  const byId = new Map(lessons.map((l) => [l.id, l]));
  for (const t of topicRows) {
    const topic: Topic = t.song_id ? { kind: 'song', key: t.key, songId: t.song_id } : { kind: 'word', key: t.key, label: t.label ?? '' };
    byId.get(t.lesson_id)?.topics.push(topic);
  }
  for (const r of lineRows) {
    const line: Line = { id: r.id, text: r.text, topicKey: r.topic_key, ...(r.at != null ? { at: r.at } : {}) };
    byId.get(r.lesson_id)?.[r.kind].push(line);
  }
  return { folders, songs, lessons };
}

export async function addFolder(db: SQLiteDatabase, name: string, teacher: string): Promise<string> {
  const id = newId('f');
  await db.runAsync('INSERT INTO folders (id, name, teacher, created_at) VALUES (?, ?, ?, ?)', id, name, teacher, Date.now());
  return id;
}

export async function updateFolder(db: SQLiteDatabase, id: string, name: string, teacher: string) {
  await db.runAsync('UPDATE folders SET name = ?, teacher = ? WHERE id = ?', name, teacher, id);
}

/** フォルダを消すと一緒に消えるものの件数（削除の前に見せる） */
export async function folderContents(db: SQLiteDatabase, id: string) {
  const r = await db.getFirstAsync<{ lessons: number; songs: number }>(
    `SELECT (SELECT COUNT(*) FROM lessons WHERE folder_id = $id) AS lessons,
            (SELECT COUNT(*) FROM songs WHERE folder_id = $id) AS songs`,
    { $id: id },
  );
  return { lessons: r?.lessons ?? 0, songs: r?.songs ?? 0 };
}

/** フォルダと、そのレッスン・曲・トピック・行をまとめて消す（外部キーの ON DELETE CASCADE） */
export async function deleteFolder(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM folders WHERE id = ?', id);
}

export async function addLesson(db: SQLiteDatabase, folderId: string, date: string): Promise<string> {
  const id = newId('l');
  await db.runAsync('INSERT INTO lessons (id, folder_id, date, created_at) VALUES (?, ?, ?, ?)', id, folderId, date, Date.now());
  return id;
}

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', key);
  return r?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}
