// 動作確認用のサンプルデータ（試作 design/prototypes/core.js の seed をもとにしている）
// データの保存を作る区切りで、ここは使わなくなる
import type { AppData } from './types';

export const sampleData: AppData = {
  folders: [
    { id: 't1', name: 'バイオリン', teacher: 'ブライアン先生' },
    { id: 't2', name: 'ボイトレ', teacher: '駅前ボイス教室' },
  ],
  songs: [
    { id: 's1', folderId: 't1', title: 'ヴィヴァルディ 協奏曲 イ短調', sub: '第1楽章' },
    { id: 's2', folderId: 't1', title: 'カイザー 練習曲', sub: '8番' },
    { id: 's3', folderId: 't1', title: 'スケール', sub: '3オクターブ' },
    { id: 's4', folderId: 't1', title: '第九', sub: '精華オケ 2nd' },
    { id: 's5', folderId: 't2', title: 'Lemon', sub: '米津玄師' },
    { id: 's6', folderId: 't2', title: 'マリーゴールド', sub: 'あいみょん' },
  ],
  lessons: [
    {
      id: 'L1', folderId: 't1', date: '2026-11-16',
      topics: [
        { kind: 'song', key: 'k1', songId: 's1' },
        { kind: 'song', key: 'k2', songId: 's3' },
        { kind: 'word', key: 'k3', label: '手首が固まってしまう' },
      ],
      homework: [
        { id: 'h1', text: 'ヴィヴァルディ 20〜36小節をゆっくり', topicKey: null },
        { id: 'h2', text: 'スケールは3オクターブをテンポ60で', topicKey: null },
      ],
      learned: [
        { id: 'n1', text: '3ポジへの移動は親指を先に動かす', topicKey: 'k1', at: 760 },
        { id: 'n2', text: '20小節目からは弓を多めに使ってフレーズを大きく', topicKey: 'k1', at: 1310 },
        { id: 'n3', text: '上りと下りで音程の取り方を変えない', topicKey: 'k2' },
        { id: 'n4', text: '弓を返すときに手首を固めない', topicKey: 'k3', at: 410 },
      ],
    },
    {
      id: 'L2', folderId: 't1', date: '2026-11-09',
      topics: [
        { kind: 'song', key: 'k1', songId: 's1' },
        { kind: 'song', key: 'k2', songId: 's2' },
      ],
      homework: [
        { id: 'h1', text: 'ヴィヴァルディ 冒頭〜19小節', topicKey: null },
        { id: 'h2', text: 'カイザー8番 前半をテンポ72で', topicKey: null },
      ],
      learned: [
        { id: 'n1', text: '冒頭の付点はもっと軽く', topicKey: 'k1' },
        { id: 'n2', text: '開放弦に逃げずに4の指で取る', topicKey: 'k2' },
      ],
    },
    {
      id: 'L3', folderId: 't1', date: '2026-11-02',
      topics: [{ kind: 'song', key: 'k1', songId: 's2' }],
      homework: [{ id: 'h1', text: 'カイザー8番 移弦の箇所だけ取り出して', topicKey: null }],
      learned: [{ id: 'n1', text: '移弦は肘の高さから先に変える', topicKey: 'k1' }],
    },
    {
      id: 'L4', folderId: 't2', date: '2026-11-12',
      topics: [{ kind: 'song', key: 'k1', songId: 's5' }],
      homework: [
        { id: 'h1', text: 'リップロールで音階 5分', topicKey: null },
        { id: 'h2', text: 'Lemonのサビを録って聞き返す', topicKey: null },
      ],
      learned: [
        { id: 'n1', text: '高音は喉で押さずに息の量で出す', topicKey: null },
        { id: 'n2', text: 'サビ前のブレスを半拍早めに', topicKey: 'k1' },
      ],
    },
    {
      id: 'L5', folderId: 't2', date: '2026-10-29',
      topics: [
        { kind: 'song', key: 'k1', songId: 's5' },
        { kind: 'song', key: 'k2', songId: 's6' },
      ],
      homework: [{ id: 'h1', text: 'マリーゴールド Aメロを語りかけるように', topicKey: null }],
      learned: [{ id: 'n1', text: '語尾を投げずに最後まで息を流す', topicKey: 'k1' }],
    },
  ],
};
