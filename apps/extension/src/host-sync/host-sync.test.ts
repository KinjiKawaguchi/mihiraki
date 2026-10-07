import { afterEach, describe, expect, it, vi } from "vitest";
import { installHostBridge } from "./bridge";
import { createHostSyncClient } from "./client";
import type { ReviewStores } from "./github-stores";
import type { HostChange } from "./protocol";

const message: HostChange = {
  kind: "threadCreated",
  target: { path: "docs/a.md", side: "head", lines: { start: 3, end: 3 } },
  mode: "review",
  thread: { id: "42" },
};

function fakeStores() {
  let listener: ((state: unknown, previous: unknown) => void) | null = null;
  let pageListener: ((state: unknown, previous: unknown) => void) | null = null;
  let pageState: unknown = { viewSettings: { splitPreference: "split" } };
  const stores = {
    page: {
      getState: () => pageState,
      setState: () => undefined,
      subscribe: (next: (state: unknown, previous: unknown) => void) => {
        pageListener = next;
        return () => {
          pageListener = null;
        };
      },
    },
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
  const changeLayout = (splitPreference: string) => {
    const previous = pageState;
    pageState = { viewSettings: { splitPreference } };
    pageListener?.(pageState, previous);
  };
  return {
    stores,
    emitChange: () => listener?.({ markers: { "a.md": {} } }, { markers: {} }),
    changeLayout,
  };
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
    install({ findStores: () => fakeStores().stores, apply: vi.fn() });

    expect(await createHostSyncClient(document, { timeoutMs: 50 }).isHostAvailable()).toBe(true);
  });

  it("reports the host as unavailable when the stores cannot be found", async () => {
    install({ findStores: () => null, apply: vi.fn() });

    expect(await createHostSyncClient(document, { timeoutMs: 50 }).isHostAvailable()).toBe(false);
  });

  it("reports the host as unavailable when no bridge answers", async () => {
    expect(await createHostSyncClient(document, { timeoutMs: 20 }).isHostAvailable()).toBe(false);
  });

  it("has the bridge apply a change as the signed-in viewer and reports the outcome", async () => {
    const apply = vi.fn().mockReturnValue(true);
    install({ findStores: () => fakeStores().stores, apply });
    const clientEnv = document.createElement("script");
    clientEnv.id = "client-env";
    clientEnv.type = "application/json";
    clientEnv.textContent = '{"login":"mona","locale":"en"}';
    document.body.append(clientEnv);
    cleanups.push(() => clientEnv.remove());

    const isApplied = await createHostSyncClient(document, {
      timeoutMs: 50,
    }).announceChange(message);

    expect(isApplied).toBe(true);
    expect(apply).toHaveBeenCalledWith(expect.anything(), { ...message, threadId: 42 }, "mona");
  });

  it("tells listeners when a change could not be shown in GitHub UI", async () => {
    install({ findStores: () => fakeStores().stores, apply: vi.fn().mockReturnValue(false) });
    const client = createHostSyncClient(document, { timeoutMs: 50 });
    const onSyncLost = vi.fn();
    cleanups.push(client.onSyncLost(onSyncLost));

    await client.announceChange(message);

    expect(onSyncLost).toHaveBeenCalledTimes(1);
  });

  it("does not bother listeners while changes are shown in GitHub UI", async () => {
    install({ findStores: () => fakeStores().stores, apply: vi.fn().mockReturnValue(true) });
    const client = createHostSyncClient(document, { timeoutMs: 50 });
    const onSyncLost = vi.fn();
    cleanups.push(client.onSyncLost(onSyncLost));

    await client.announceChange(message);

    expect(onSyncLost).not.toHaveBeenCalled();
  });

  it("forwards changes made to GitHub threads to the extension", async () => {
    const { stores, emitChange } = fakeStores();
    install({ findStores: () => stores, apply: vi.fn() });
    const client = createHostSyncClient(document, { timeoutMs: 50 });
    const onChange = vi.fn();
    cleanups.push(client.onHostThreadsChanged(onChange));
    await client.isHostAvailable();

    emitChange();

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("ignores change messages that do not validate", async () => {
    const apply = vi.fn().mockReturnValue(true);
    install({ findStores: () => fakeStores().stores, apply });

    document.dispatchEvent(
      new CustomEvent("mihiraki:host-change", {
        detail: '{"requestId":"x","change":{"target":1}}',
      }),
    );

    expect(apply).not.toHaveBeenCalled();
  });

  it("tells the extension GitHub's diff layout, and again whenever it changes", async () => {
    const { stores, changeLayout } = fakeStores();
    install({ findStores: () => stores, apply: vi.fn() });
    const client = createHostSyncClient(document, { timeoutMs: 50 });
    const layouts: string[] = [];
    cleanups.push(client.watchDiffLayout((layout) => layouts.push(layout)));

    await vi.waitFor(() => expect(layouts).toEqual(["split"]));
    changeLayout("unified");

    expect(layouts).toEqual(["split", "unified"]);
  });
});
