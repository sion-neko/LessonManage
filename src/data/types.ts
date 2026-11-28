// データの形。docs/requirements.md と docs/adr/ に合わせる

/** フォルダ：習いごとごとに1つ作る入れ物（バイオリン、ボイトレなど） */
export type Folder = {
  id: string;
  name: string;
  teacher: string;
};

export type Song = {
  id: string;
  folderId: string;
  title: string;
  sub: string;
};

/** レッスンのトピック：曲か、曲以外の言葉 */
export type Topic =
  | { kind: 'song'; key: string; songId: string }
  | { kind: 'word'; key: string; label: string };

/** やること・学んだことの1行 */
export type Line = {
  id: string;
  text: string;
  /** 学んだことのトピック。null はトピックなし。やることでは使わない */
  topicKey: string | null;
  /** レッスン録音の経過時間（秒）。録音中に書いた行と、再生画面で足したしおりが持つ */
  at?: number;
  /** 名前を書かずに足したしおり（「しおり 1」…）。録音を消すと一緒に消える */
  bookmark?: boolean;
};

/** 再生画面で「この時間からのトピック」を選び直したところ */
export type ChapterCut = { at: number; topicKey: string | null };

export type Lesson = {
  id: string;
  folderId: string;
  /** YYYY-MM-DD */
  date: string;
  topics: Topic[];
  homework: Line[];
  learned: Line[];
  chapterCuts: ChapterCut[];
};

/** メモ：レッスン後の個人練のメモ（lessonId）か、曲ページの自分のメモ（songId） */
export type Memo = {
  id: string;
  folderId: string;
  lessonId: string | null;
  songId: string | null;
  /** YYYY-MM-DD */
  date: string;
  text: string;
};

/**
 * 録音。「どのレッスンの後か」と「どの曲か」をそれぞれ任意で持つ（docs/adr/0003）
 * - lesson：レッスンの録音（lessonId あり、songId なし）
 * - practice：個人練の録音（直前のレッスン、弾いた曲は任意）
 * - song：曲だけの録音（lessonId なし）
 */
export type Recording = {
  id: string;
  folderId: string;
  kind: 'lesson' | 'practice' | 'song';
  lessonId: string | null;
  songId: string | null;
  /** YYYY-MM-DD */
  date: string;
  /** 長さ（秒） */
  duration: number;
  /** 録音のあとに書く一言 */
  note: string;
  /** しおり（レッスン録音以外。レッスン録音のしおりは学んだことの行） */
  marks: RecMark[];
  /** 端末のファイル。iOS ではアプリの場所が変わることがあるので、書類フォルダからの名前だけを持つ（Web は blob の URL） */
  file: string;
};

export type RecMark = { id: string; at: number; text: string; bookmark: boolean };

export type AppData = {
  folders: Folder[];
  songs: Song[];
  lessons: Lesson[];
  memos: Memo[];
  recordings: Recording[];
};
