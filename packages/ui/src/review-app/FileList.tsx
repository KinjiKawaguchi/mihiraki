import type { ChangedFile } from "@mihiraki/core";
import { useMessages } from "../i18n/i18n";

interface FileListProps {
  readonly files: readonly ChangedFile[];
  readonly selectedPath: string;
  readonly onSelect: (path: string) => void;
}

export function FileList({ files, selectedPath, onSelect }: FileListProps) {
  const t = useMessages();
  return (
    <nav class="mhr-files" aria-label={t.markdownFiles}>
      {files.map((file) => (
        <button
          type="button"
          key={file.path}
          class="mhr-files__item"
          aria-current={file.path === selectedPath ? "true" : undefined}
          aria-label={file.path}
          title={file.path}
          onClick={() => onSelect(file.path)}
        >
          <span class="mhr-files__change">{t.changeType[file.changeType]}</span>
          <span class="mhr-files__path">{file.path}</span>
        </button>
      ))}
    </nav>
  );
}
