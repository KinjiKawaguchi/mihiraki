/** Styles for the toggle's own shadow root, modelled on GitHub's small header buttons. */
export const SPLIT_TOGGLE_CSS = `
.bgm-toggle {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--borderColor-default, #d1d9e0);
  border-radius: 6px;
  background: var(--bgColor-default, #ffffff);
  color: var(--fgColor-default, #1f2328);
  font: 500 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
  cursor: pointer;
  white-space: nowrap;
}
.bgm-toggle:hover { background: var(--bgColor-muted, #f6f8fa); }
.bgm-toggle[aria-pressed='true'] {
  border-color: transparent;
  background: var(--bgColor-accent-emphasis, #0969da);
  color: var(--fgColor-onEmphasis, #ffffff);
}
`;

interface SplitToggleProps {
  readonly isActive: boolean;
  readonly onToggle: () => void;
}

export function SplitToggle({ isActive, onToggle }: SplitToggleProps) {
  return (
    <button
      type="button"
      class="bgm-toggle"
      aria-pressed={isActive ? "true" : "false"}
      title="Markdownをレンダリングしたまま左右分割で表示"
      onClick={onToggle}
    >
      分割
    </button>
  );
}
