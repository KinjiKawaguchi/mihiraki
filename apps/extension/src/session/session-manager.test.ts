import { err, ok } from "@mihiraki/core";
import { describe, expect, it, vi } from "vitest";
import { createSessionManager } from "./session-manager";

function manualScheduler() {
  let tasks: { callback: () => void; delayMs: number; isCancelled: boolean }[] = [];
  const schedule = (callback: () => void, delayMs: number) => {
    const task = { callback, delayMs, isCancelled: false };
    tasks = [...tasks, task];
    return () => {
      task.isCancelled = true;
    };
  };
  const runNext = () => {
    const next = tasks.find((task) => !task.isCancelled);
    tasks = tasks.filter((task) => task !== next);
    next?.callback();
    return next?.delayMs;
  };
  const pending = () => tasks.filter((task) => !task.isCancelled).length;
  return { schedule, runNext, pending };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createSessionManager", () => {
  it("starts a session for a pull request and stops it when leaving", async () => {
    const stop = vi.fn();
    const start = vi.fn().mockResolvedValue(ok(stop));
    const manager = createSessionManager({ start });

    manager.sync("acme/docs#1");
    manager.sync("acme/docs#1");
    manager.sync(null);
    await flush();

    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("retries a session that failed to start, with growing delays", async () => {
    const scheduler = manualScheduler();
    const start = vi
      .fn()
      .mockResolvedValueOnce(err({ kind: "network" }))
      .mockResolvedValueOnce(ok(vi.fn()));
    const manager = createSessionManager({
      start,
      retryDelaysMs: [2000, 10000],
      schedule: scheduler.schedule,
    });

    manager.sync("acme/docs#1");
    await flush();
    const delay = scheduler.runNext();
    await flush();

    expect(delay).toBe(2000);
    expect(start).toHaveBeenCalledTimes(2);
    expect(scheduler.pending()).toBe(0);
  });

  it("drops a pending retry when the reviewer moves elsewhere", async () => {
    const scheduler = manualScheduler();
    const start = vi.fn().mockResolvedValue(err({ kind: "network" }));
    const manager = createSessionManager({
      start,
      retryDelaysMs: [2000],
      schedule: scheduler.schedule,
    });

    manager.sync("acme/docs#1");
    await flush();
    manager.sync(null);
    scheduler.runNext();
    await flush();

    expect(start).toHaveBeenCalledTimes(1);
  });

  it("gives up after the configured retries", async () => {
    const scheduler = manualScheduler();
    const onGiveUp = vi.fn();
    const start = vi.fn().mockResolvedValue(err({ kind: "network" }));
    const manager = createSessionManager({
      start,
      retryDelaysMs: [10, 20],
      schedule: scheduler.schedule,
      onGiveUp,
    });

    manager.sync("acme/docs#1");
    for (let i = 0; i < 3; i += 1) {
      await flush();
      scheduler.runNext();
    }
    await flush();

    expect(start).toHaveBeenCalledTimes(3);
    expect(onGiveUp).toHaveBeenCalledWith({ kind: "network" });
  });

  it("gives up at once on a start that breaks, since retrying a bug cannot help", async () => {
    const scheduler = manualScheduler();
    const onGiveUp = vi.fn();
    const bug = new TypeError("x is undefined");
    const start = vi.fn().mockRejectedValue(bug);
    const manager = createSessionManager({ start, schedule: scheduler.schedule, onGiveUp });

    manager.sync("acme/docs#1");
    await flush();

    expect(scheduler.pending()).toBe(0);
    expect(onGiveUp).toHaveBeenCalledWith(bug);
  });
});
