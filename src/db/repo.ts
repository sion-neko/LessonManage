import type { SQLiteDatabase } from 'expo-sqlite';

import type { AppData, Folder, Lesson, Line, Memo, RecMark, Recording, Song, Topic } from '@/data/types';
import { newId } from '@/lib/id';

// SQLite とアプリのデータの形の行き来。画面からは state/app-state.tsx を通して使う

type LessonRow = { id: string; folder_id: string; date: string };
type TopicRow = { lesson_id: string; key: string; song_id: string | null; label: string | null };
type LineRow = { id: string; lesson_id: string; kind: 'homework' | 'learned'; topic_key: string | null; text: string; at: number | null; bookmark: number };

/** 全部読む。量が増えて重くなったら、フォルダごとに読むように変える */
export async function loadAll(db: SQLiteDatabase): Promise<AppData> {
  const folders = await db.getAllAsync<Folder>('SELECT id, name, teacher FROM folders ORDER BY created_at');
  const songs = await db.getAllAsync<Song>('SELECT id, folder_id AS folderId, title, sub FROM songs ORDER BY created_at');
  const lessonRows = await db.getAllAsync<LessonRow>('SELECT id, folder_id, date FROM lessons ORDER BY date DESC, created_at DESC');
  const topicRows = await db.getAllAsync<TopicRow>('SELECT lesson_id, key, song_id, label FROM lesson_topics ORDER BY pos');
  const lineRows = await db.getAllAsync<LineRow>('SELECT id, lesson_id, kind, topic_key, text, at, bookmark FROM lines ORDER BY pos');

  const lessons: Lesson[] = lessonRows.map((r) => ({
    id: r.id,
    folderId: r.folder_id,
    date: r.date,
    topics: [],
    homework: [],
    learned: [],
    chapterCuts: [],
  }));
  const byId = new Map(lessons.map((l) => [l.id, l]));
  for (const t of topicRows) {
    const topic: Topic = t.song_id ? { kind: 'song', key: t.key, songId: t.song_id } : { kind: 'word', key: t.key, label: t.label ?? '' };
    byId.get(t.lesson_id)?.topics.push(topic);
  }
  for (const r of lineRows) {
    const line: Line = { id: r.id, text: r.text, topicKey: r.topic_key, ...(r.at != null ? { at: r.at } : {}), ...(r.bookmark ? { bookmark: true } : {}) };
    byId.get(r.lesson_id)?.[r.kind].push(line);
  }
  const memos = await db.getAllAsync<Memo>(
    'SELECT id, folder_id AS folderId, lesson_id AS lessonId, song_id AS songId, date, text FROM memos ORDER BY date DESC, created_at',
  );
  const cuts = await db.getAllAsync<{ lesson_id: string; at: number; topic_key: string | null }>('SELECT lesson_id, at, topic_key FROM lesson_chapters ORDER BY at');
  for (const c of cuts) byId.get(c.lesson_id)?.chapterCuts.push({ at: c.at, topicKey: c.topic_key });
  const recRows = await db.getAllAsync<Omit<Recording, 'marks'>>(
    `SELECT id, folder_id AS folderId, kind, lesson_id AS lessonId, song_id AS songId, date, duration, note, file
     FROM recordings ORDER BY date DESC, created_at DESC`,
  );
  const markRows = await db.getAllAsync<{ id: string; recording_id: string; at: number; text: string; bookmark: number }>(
    'SELECT id, recording_id, at, text, bookmark FROM rec_marks ORDER BY at',
  );
  const recordings: Recording[] = recRows.map((r) => ({ ...r, marks: [] }));
  const recById = new Map(recordings.map((r) => [r.id, r]));
  for (const m of markRows) recById.get(m.recording_id)?.marks.push({ id: m.id, at: m.at, text: m.text, bookmark: !!m.bookmark } satisfies RecMark);
  return { folders, songs, lessons, memos, recordings };
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
  const r = await db.getFirstAsync<{ lessons: number; songs: number; recordings: number }>(
    `SELECT (SELECT COUNT(*) FROM lessons WHERE folder_id = $id) AS lessons,
            (SELECT COUNT(*) FROM songs WHERE folder_id = $id) AS songs,
            (SELECT COUNT(*) FROM recordings WHERE folder_id = $id) AS recordings`,
    { $id: id },
  );
  return { lessons: r?.lessons ?? 0, songs: r?.songs ?? 0, recordings: r?.recordings ?? 0 };
}

/** フォルダと、そのレッスン・曲・トピック・行・メモ・録音をまとめて消す（外部キーの ON DELETE CASCADE）。消した録音のファイル名を返す */
export async function deleteFolder(db: SQLiteDatabase, id: string): Promise<string[]> {
  const files = await db.getAllAsync<{ file: string }>('SELECT file FROM recordings WHERE folder_id = ?', id);
  await db.runAsync('DELETE FROM folders WHERE id = ?', id);
  return files.map((f) => f.file);
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

// ── 曲 ──

export async function addSong(db: SQLiteDatabase, folderId: string, title: string): Promise<string> {
  const id = newId('s');
  await db.runAsync('INSERT INTO songs (id, folder_id, title, created_at) VALUES (?, ?, ?, ?)', id, folderId, title, Date.now());
  return id;
}

// ── レッスンのトピック ──

async function nextTopicPos(db: SQLiteDatabase, lessonId: string) {
  const r = await db.getFirstAsync<{ p: number | null }>('SELECT MAX(pos) AS p FROM lesson_topics WHERE lesson_id = ?', lessonId);
  return (r?.p ?? -1) + 1;
}

export async function addSongTopic(db: SQLiteDatabase, lessonId: string, songId: string) {
  await db.runAsync(
    'INSERT INTO lesson_topics (lesson_id, key, song_id, label, pos) VALUES (?, ?, ?, NULL, ?)',
    lessonId, newId('k'), songId, await nextTopicPos(db, lessonId),
  );
}

export async function addWordTopic(db: SQLiteDatabase, lessonId: string, label: string) {
  await db.runAsync(
    'INSERT INTO lesson_topics (lesson_id, key, song_id, label, pos) VALUES (?, ?, NULL, ?, ?)',
    lessonId, newId('k'), label, await nextTopicPos(db, lessonId),
  );
}

export async function renameWordTopic(db: SQLiteDatabase, lessonId: string, key: string, label: string) {
  await db.runAsync('UPDATE lesson_topics SET label = ? WHERE lesson_id = ? AND key = ? AND song_id IS NULL', label, lessonId, key);
}

/** トピックを外す。その下に書いた行は「トピックなし」に戻す */
export async function removeTopic(db: SQLiteDatabase, lessonId: string, key: string) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE lines SET topic_key = NULL WHERE lesson_id = ? AND topic_key = ?', lessonId, key);
    await db.runAsync('DELETE FROM lesson_topics WHERE lesson_id = ? AND key = ?', lessonId, key);
  });
}

// ── やること・学んだことの行 ──

export async function addLine(db: SQLiteDatabase, lessonId: string, kind: 'homework' | 'learned', topicKey: string | null, text: string) {
  const r = await db.getFirstAsync<{ p: number | null }>('SELECT MAX(pos) AS p FROM lines WHERE lesson_id = ?', lessonId);
  await db.runAsync(
    'INSERT INTO lines (id, lesson_id, kind, topic_key, text, at, pos) VALUES (?, ?, ?, ?, ?, NULL, ?)',
    newId('n'), lessonId, kind, topicKey, text, (r?.p ?? -1) + 1,
  );
}

/** 行を直す。名前のないしおりも、名前を書いたらふつうの行になる */
export async function updateLine(db: SQLiteDatabase, id: string, text: string) {
  await db.runAsync('UPDATE lines SET text = ?, bookmark = 0 WHERE id = ?', text, id);
}

export async function deleteLine(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM lines WHERE id = ?', id);
}

// ── メモ ──

export async function addMemo(
  db: SQLiteDatabase,
  m: { folderId: string; lessonId: string | null; songId: string | null; date: string; text: string },
) {
  await db.runAsync(
    'INSERT INTO memos (id, folder_id, lesson_id, song_id, date, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    newId('m'), m.folderId, m.lessonId, m.songId, m.date, m.text, Date.now(),
  );
}

export async function updateMemo(db: SQLiteDatabase, id: string, text: string) {
  await db.runAsync('UPDATE memos SET text = ? WHERE id = ?', text, id);
}

export async function deleteMemo(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM memos WHERE id = ?', id);
}

// ── 録音 ──

export async function addRecording(db: SQLiteDatabase, r: Omit<Recording, 'id' | 'marks'> & { id?: string }): Promise<string> {
  const id = r.id ?? newId('r');
  await db.runAsync(
    `INSERT INTO recordings (id, folder_id, kind, lesson_id, song_id, date, duration, note, file, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, r.folderId, r.kind, r.lessonId, r.songId, r.date, r.duration, r.note, r.file, Date.now(),
  );
  return id;
}

export async function setRecordingNote(db: SQLiteDatabase, id: string, note: string) {
  await db.runAsync('UPDATE recordings SET note = ? WHERE id = ?', note, id);
}

/** 行に録音の経過時間を付けて足す（レッスンの録音中に書いた行） */
export async function addLineAt(db: SQLiteDatabase, lessonId: string, topicKey: string | null, text: string, at: number) {
  const r = await db.getFirstAsync<{ p: number | null }>('SELECT MAX(pos) AS p FROM lines WHERE lesson_id = ?', lessonId);
  await db.runAsync(
    "INSERT INTO lines (id, lesson_id, kind, topic_key, text, at, pos) VALUES (?, ?, 'learned', ?, ?, ?, ?)",
    newId('n'), lessonId, topicKey, text, at, (r?.p ?? -1) + 1,
  );
}

// ── しおり・チャプター ──

/** レッスン録音のしおり：学んだことの行として入れる */
export async function addLessonMark(db: SQLiteDatabase, lessonId: string, topicKey: string | null, text: string, at: number, bookmark: boolean) {
  const r = await db.getFirstAsync<{ p: number | null }>('SELECT MAX(pos) AS p FROM lines WHERE lesson_id = ?', lessonId);
  await db.runAsync(
    "INSERT INTO lines (id, lesson_id, kind, topic_key, text, at, pos, bookmark) VALUES (?, ?, 'learned', ?, ?, ?, ?, ?)",
    newId('n'), lessonId, topicKey, text, at, (r?.p ?? -1) + 1, bookmark ? 1 : 0,
  );
}

/** 個人練などのしおり：その録音に付ける */
export async function addRecMark(db: SQLiteDatabase, recordingId: string, text: string, at: number, bookmark: boolean) {
  await db.runAsync(
    'INSERT INTO rec_marks (id, recording_id, at, text, bookmark, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    newId('k'), recordingId, at, text, bookmark ? 1 : 0, Date.now(),
  );
}

/** 「この時間からのトピック」を選び直す */
export async function setChapterCut(db: SQLiteDatabase, lessonId: string, at: number, topicKey: string | null) {
  await db.runAsync(
    'INSERT INTO lesson_chapters (lesson_id, at, topic_key) VALUES (?, ?, ?) ON CONFLICT(lesson_id, at) DO UPDATE SET topic_key = excluded.topic_key',
    lessonId, at, topicKey,
  );
}

/**
 * 録音を消す。元に戻せない。
 * - レッスン録音：書いた行は残し（録音の時間は外れる）、名前のないしおりとチャプターの選び直しは消す
 * - ほかの録音：しおりも一緒に消える
 * 消したファイル名を返す
 */
export async function deleteRecording(db: SQLiteDatabase, id: string): Promise<string | null> {
  const r = await db.getFirstAsync<{ file: string; kind: string; lesson_id: string | null }>('SELECT file, kind, lesson_id FROM recordings WHERE id = ?', id);
  if (!r) return null;
  await db.withTransactionAsync(async () => {
    if (r.kind === 'lesson' && r.lesson_id) {
      await db.runAsync('DELETE FROM lines WHERE lesson_id = ? AND bookmark = 1', r.lesson_id);
      await db.runAsync('UPDATE lines SET at = NULL WHERE lesson_id = ?', r.lesson_id);
      await db.runAsync('DELETE FROM lesson_chapters WHERE lesson_id = ?', r.lesson_id);
    }
    await db.runAsync('DELETE FROM recordings WHERE id = ?', id);
  });
  return r.file;
}

/** 曲ページから録った録音：直近のレッスン後の個人練にするか、曲だけの録音にするか */
export async function setRecordingLesson(db: SQLiteDatabase, id: string, lessonId: string | null) {
  await db.runAsync('UPDATE recordings SET lesson_id = ?, kind = ? WHERE id = ?', lessonId, lessonId ? 'practice' : 'song', id);
}
