import { fileContainerId } from "./file-anchor";

/**
 * Minimal copy of one file block of GitHub's Files changed page, as observed on
 * github.com in 2026-09 (the classes are hashed there; only structure and data / aria
 * attributes matter).
 */
export async function appendFileBlock(document: Document, path: string): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.id = await fileContainerId(path);
  container.setAttribute("role", "region");
  const tip = container.id.slice(0, 16);
  container.innerHTML = `
    <div data-diff-header-wrapper="true">
      <div class="file-header">
        <h3><a><code>${path}</code></a></h3>
        <div class="actions">
          <ul data-component="SegmentedControl" aria-label="File view">
            <li data-component="SegmentedControl.IconButton">
              <button type="button" aria-pressed="true" aria-labelledby="${tip}-source"></button>
              <span data-component="Tooltip" aria-hidden="true" id="${tip}-source">Display the source diff</span>
            </li>
            <li data-component="SegmentedControl.IconButton">
              <button type="button" aria-pressed="false" aria-labelledby="${tip}-rich"></button>
              <span data-component="Tooltip" aria-hidden="true" id="${tip}-rich">Display the rich diff</span>
            </li>
          </ul>
          <button aria-label="More options"></button>
        </div>
      </div>
    </div>
    <div class="border diff-body"><table role="grid"><tr><td>diff</td></tr></table></div>`;
  document.body.append(container);
  return container;
}

/** Switches a file block between GitHub's source diff and rich diff, as its header buttons do. */
export function showRichDiff(container: Element, isRich: boolean): void {
  const [source, rich] = Array.from(
    container.querySelectorAll('[data-component="SegmentedControl"] button'),
  );
  source?.setAttribute("aria-pressed", String(!isRich));
  rich?.setAttribute("aria-pressed", String(isRich));
}
