import { render } from "@testing-library/preact";
import { describe, expect, it } from "vitest";
import { SafeHtml } from "./SafeHtml";
import { sanitizeHtml } from "./sanitize";

describe("SafeHtml", () => {
  it("inserts sanitised HTML without scripts or event handlers", () => {
    const html = sanitizeHtml(
      '<p>hi <img src="x" onerror="alert(1)"></p><script>alert(2)</script>',
    );

    const { container } = render(<SafeHtml class="markdown-body" html={html} />);

    expect(container.querySelector(".markdown-body p")?.textContent).toBe("hi ");
    expect(container.innerHTML).not.toContain("onerror");
    expect(container.innerHTML).not.toContain("<script");
  });

  it("gives the element to the caller that needs it", () => {
    const elementRef = { current: null as HTMLDivElement | null };

    render(
      <SafeHtml class="markdown-body" html={sanitizeHtml("<p>x</p>")} elementRef={elementRef} />,
    );

    expect(elementRef.current?.innerHTML).toBe("<p>x</p>");
  });

  it("only accepts HTML that went through sanitizeHtml", () => {
    // @ts-expect-error a plain string has not been sanitised
    const element = <SafeHtml class="markdown-body" html="<p>x</p>" />;

    expect(element).toBeTruthy();
  });
});
