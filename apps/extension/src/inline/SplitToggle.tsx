/** Styles for the toggle's own shadow root, modelled on GitHub's small header buttons. */
export const SPLIT_TOGGLE_CSS = `
.mhr-toggle {
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
.mhr-toggle:hover { background: var(--bgColor-muted, #f6f8fa); }
.mhr-toggle[aria-pressed='true'] {
  border-color: transparent;
  background: var(--bgColor-accent-emphasis, #0969da);
  color: var(--fgColor-onEmphasis, #ffffff);
}
`;

interface SplitToggleProps {
  readonly isActive: boolean;
  readonly onToggle: () => void;
  readonly label: string;
  readonly title: string;
}

export function SplitToggle({ isActive, onToggle, label, title }: SplitToggleProps) {
  return (
    <button
      type="button"
      class="mhr-toggle"
      aria-pressed={isActive ? "true" : "false"}
      title={title}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}
