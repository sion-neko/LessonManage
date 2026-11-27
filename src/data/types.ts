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
  /** レッスン録音の経過時間（秒）。録音中に書いた行だけ持つ */
  at?: number;
};

export type Lesson = {
  id: string;
  folderId: string;
  /** YYYY-MM-DD */
  date: string;
  topics: Topic[];
  homework: Line[];
  learned: Line[];
};

export type AppData = {
  folders: Folder[];
  songs: Song[];
  lessons: Lesson[];
};
