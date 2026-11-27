import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

// 録音のファイルは書類フォルダの recordings/ に置く。データベースにはファイル名だけを持つ
// （iOS ではアップデートなどでアプリの場所が変わることがあるため、フルパスを持たない）。
// Web はファイルを置けないので、録ったときの blob の URL をそのまま持つ（再読み込みで消える。確かめる用）

const DIR = 'recordings';

function dir() {
  const d = new Directory(Paths.document, DIR);
  if (!d.exists) d.create({ idempotent: true, intermediates: true });
  return d;
}

/** 録り終わったファイルを recordings/ へ移し、データベースに入れる名前を返す */
export async function keepRecording(tempUri: string, id: string): Promise<string> {
  if (Platform.OS === 'web') return tempUri;
  const src = new File(tempUri);
  const name = `${id}.${src.extension.replace(/^\./, '') || 'm4a'}`;
  await src.move(new File(dir(), name));
  return name;
}

/** 再生するときの URI */
export function recordingUri(file: string): string {
  if (Platform.OS === 'web' || file.includes('://')) return file;
  return new File(Paths.document, DIR, file).uri;
}

export function deleteRecordingFiles(files: string[]) {
  if (Platform.OS === 'web') return;
  for (const f of files) {
    try {
      const file = new File(Paths.document, DIR, f);
      if (file.exists) file.delete();
    } catch {
      // 見つからないファイルは気にしない
    }
  }
}
