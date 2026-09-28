import { afterEach, describe, expect, it, vi } from "vitest";
import { watchDocument } from "./document-watch";

/** MutationObserver delivers its records in a microtask. */
const flushMutations = () => new Promise<void>((resolve) => queueMicrotask(resolve));

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("watchDocument", () => {
  it("calls back once for a burst of changes", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const stop = watchDocument(document, onChange);

    document.body.append(document.createElement("div"));
    document.body.append(document.createElement("div"));
    await flushMutations();
    vi.runAllTimers();
    stop();

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not call back after being stopped, even for changes seen just before", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const stop = watchDocument(document, onChange);

    document.body.append(document.createElement("div"));
    await flushMutations();
    stop();
    vi.runAllTimers();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls back when a button's pressed state changes, as when a file switches to rich diff", async () => {
    vi.useFakeTimers();
    const button = document.createElement("button");
    button.setAttribute("aria-pressed", "false");
    document.body.append(button);
    const onChange = vi.fn();
    const stop = watchDocument(document, onChange);

    button.setAttribute("aria-pressed", "true");
    await flushMutations();
    vi.runAllTimers();
    stop();

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
