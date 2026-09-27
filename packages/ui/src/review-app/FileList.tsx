import type { ChangedFile } from "@better-gh-md/core";

interface FileListProps {
  readonly files: readonly ChangedFile[];
  readonly selectedPath: string;
  readonly onSelect: (path: string) => void;
}

const CHANGE_MARK: Readonly<Record<ChangedFile["changeType"], string>> = {
  ADDED: "追加",
  MODIFIED: "変更",
  REMOVED: "削除",
  RENAMED: "移動",
};

export function FileList({ files, selectedPath, onSelect }: FileListProps) {
  return (
    <nav class="bgm-files" aria-label="Markdownファイル">
      {files.map((file) => (
        <button
          type="button"
          key={file.path}
          class="bgm-files__item"
          aria-current={file.path === selectedPath ? "true" : undefined}
          aria-label={file.path}
          title={file.path}
          onClick={() => onSelect(file.path)}
        >
          <span class="bgm-files__change">{CHANGE_MARK[file.changeType]}</span>
          <span class="bgm-files__path">{file.path}</span>
        </button>
      ))}
    </nav>
  );
}
