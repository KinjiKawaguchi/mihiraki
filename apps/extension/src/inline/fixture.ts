import { fileContainerId } from "./file-anchor";

/**
 * Minimal copy of one file block of GitHub's Files changed page, as observed on
 * github.com (the classes are hashed there; only structure and data attributes matter).
 */
export async function appendFileBlock(document: Document, path: string): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.id = await fileContainerId(path);
  container.setAttribute("role", "region");
  container.innerHTML = `
    <div data-diff-header-wrapper="true">
      <div class="file-header">
        <h3><a><code>${path}</code></a></h3>
        <div class="actions">
          <ul data-component="SegmentedControl" aria-label="File view">
            <li><button aria-label="Display the source diff"></button></li>
            <li><button aria-label="Display the rich diff"></button></li>
          </ul>
          <button aria-label="More options"></button>
        </div>
      </div>
    </div>
    <div class="border diff-body"><table role="grid"><tr><td>diff</td></tr></table></div>`;
  document.body.append(container);
  return container;
}
