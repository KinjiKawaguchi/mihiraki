import { afterEach, describe, expect, it, vi } from "vitest";
import { installHostBridge } from "./bridge";
import { createHostSyncClient } from "./client";
import type { ReviewStores } from "./github-stores";
import type { ThreadCreatedMessage } from "./protocol";

const message: ThreadCreatedMessage = {
  target: { path: "docs/a.md", side: "RIGHT", line: 3, startLine: null },
  mode: "review",
  thread: { id: "42" },
};

function fakeStores() {
  let listener: ((state: unknown, previous: unknown) => void) | null = null;
  const stores = {
    page: { getState: () => ({}), setState: () => undefined, subscribe: () => () => undefined },
    layout: {
      getState: () => ({}),
      setState: () => undefined,
      subscribe: (next: (state: unknown, previous: unknown) => void) => {
        listener = next;
        return () => {
          listener = null;
        };
      },
    },
  } satisfies ReviewStores;
  return { stores, emitChange: () => listener?.({ markers: { "a.md": {} } }, { markers: {} }) };
}

let cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
});

function install(options: Parameters<typeof installHostBridge>[1]) {
  cleanups.push(installHostBridge(document, options));
}

describe("host sync between the extension and the page bridge", () => {
  it("reports the host as available when the bridge reaches GitHub stores", async () => {
    install({ findStores: () => fakeStores().stores, register: vi.fn() });

    expect(await createHostSyncClient(document, { timeoutMs: 50 }).isHostAvailable()).toBe(true);
  });

  it("reports the host as unavailable when the stores cannot be found", async () => {
    install({ findStores: () => null, register: vi.fn() });

    expect(await createHostSyncClient(document, { timeoutMs: 50 }).isHostAvailable()).toBe(false);
  });

  it("reports the host as unavailable when no bridge answers", async () => {
    expect(await createHostSyncClient(document, { timeoutMs: 20 }).isHostAvailable()).toBe(false);
  });

  it("has the bridge register a created thread and reports the outcome", async () => {
    const register = vi.fn().mockReturnValue(true);
    install({ findStores: () => fakeStores().stores, register });

    const isRegistered = await createHostSyncClient(document, {
      timeoutMs: 50,
    }).announceThreadCreated(message);

    expect(isRegistered).toBe(true);
    expect(register).toHaveBeenCalledWith(expect.anything(), message);
  });

  it("forwards changes made to GitHub threads to the extension", async () => {
    const { stores, emitChange } = fakeStores();
    install({ findStores: () => stores, register: vi.fn() });
    const client = createHostSyncClient(document, { timeoutMs: 50 });
    const onChange = vi.fn();
    cleanups.push(client.onHostThreadsChanged(onChange));
    await client.isHostAvailable();

    emitChange();

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("ignores thread messages that do not validate", async () => {
    const register = vi.fn().mockReturnValue(true);
    install({ findStores: () => fakeStores().stores, register });

    document.dispatchEvent(
      new CustomEvent("mihiraki:thread-created", {
        detail: '{"requestId":"x","message":{"target":1}}',
      }),
    );

    expect(register).not.toHaveBeenCalled();
  });
});
