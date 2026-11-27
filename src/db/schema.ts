import type { SQLiteDatabase } from 'expo-sqlite';

// データは端末の SQLite に置く（docs/adr/0001）。
// 形を変えるときは、下の MIGRATIONS の最後に足す。すでにある分は書き換えない（使っている人のデータが壊れるため）
const MIGRATIONS: string[] = [
  // 1：フォルダ・曲・レッスン・トピック・行
  `
  CREATE TABLE folders (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    teacher TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE songs (
    id TEXT PRIMARY KEY NOT NULL,
    folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sub TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX songs_folder ON songs(folder_id);
  CREATE TABLE lessons (
    id TEXT PRIMARY KEY NOT NULL,
    folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX lessons_folder ON lessons(folder_id, date);
  -- レッスンのトピック：曲（song_id）か、曲以外の言葉（label）
  CREATE TABLE lesson_topics (
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    song_id TEXT REFERENCES songs(id) ON DELETE CASCADE,
    label TEXT,
    pos INTEGER NOT NULL,
    PRIMARY KEY (lesson_id, key)
  );
  -- やること（kind = 'homework'）と学んだこと（kind = 'learned'）の1行
  CREATE TABLE lines (
    id TEXT PRIMARY KEY NOT NULL,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('homework', 'learned')),
    topic_key TEXT,
    text TEXT NOT NULL,
    at REAL,
    pos INTEGER NOT NULL
  );
  CREATE INDEX lines_lesson ON lines(lesson_id);
  -- 今のフォルダなど、アプリの小さな設定
  CREATE TABLE app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // 2：メモ（レッスン後の個人練のメモ、曲ページの自分のメモ）。日付ごとにまとめて見せる
  `
  CREATE TABLE memos (
    id TEXT PRIMARY KEY NOT NULL,
    folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    lesson_id TEXT REFERENCES lessons(id) ON DELETE CASCADE,
    song_id TEXT REFERENCES songs(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX memos_lesson ON memos(lesson_id);
  CREATE INDEX memos_song ON memos(song_id);
  `,
  // 3：録音
  `
  CREATE TABLE recordings (
    id TEXT PRIMARY KEY NOT NULL,
    folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('lesson', 'practice', 'song')),
    lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
    song_id TEXT REFERENCES songs(id) ON DELETE SET NULL,
    date TEXT NOT NULL,
    duration REAL NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    file TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX recordings_lesson ON recordings(lesson_id);
  CREATE INDEX recordings_song ON recordings(song_id);
  `,
];

export async function migrate(db: SQLiteDatabase) {
  // 接続ごとの設定はトランザクションの外で
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if (!row) throw new Error('データベースの版が読めない');
  const current = row.user_version;
  if (current > MIGRATIONS.length) throw new Error('このアプリより新しい形のデータベース');
  if (current === MIGRATIONS.length) return;
  await db.withTransactionAsync(async () => {
    for (let v = current; v < MIGRATIONS.length; v++) await db.execAsync(MIGRATIONS[v]);
    await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length}`);
  });
}
