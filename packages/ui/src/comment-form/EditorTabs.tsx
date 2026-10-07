import { useMessages } from "../i18n/i18n";

/** Write / Preview tabs above a comment's text, as on GitHub. */
export function EditorTabs({
  isPreview,
  onChange,
}: {
  readonly isPreview: boolean;
  readonly onChange: (isPreview: boolean) => void;
}) {
  const t = useMessages();
  return (
    <div class="mhr-form__tabs" role="tablist">
      <button type="button" role="tab" aria-selected={!isPreview} onClick={() => onChange(false)}>
        {t.write}
      </button>
      <button type="button" role="tab" aria-selected={isPreview} onClick={() => onChange(true)}>
        {t.preview}
      </button>
    </div>
  );
}
