import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import type { LanguageSlot } from "./language-setting";
import { SettingsPopup } from "./SettingsPopup";

function fakeSlot(stored: unknown): LanguageSlot & { readonly saved: unknown[] } {
  const saved: unknown[] = [];
  return {
    saved,
    getValue: async () => stored,
    setValue: vi.fn(async (value) => {
      saved.push(value);
    }),
    watch: () => () => undefined,
  };
}

describe("SettingsPopup", () => {
  it("shows the stored choice, in the language it resolves to", async () => {
    render(<SettingsPopup slot={fakeSlot("ja")} preferredLanguages={["en-US"]} />);

    expect(await screen.findByText("表示言語")).toBeTruthy();
    expect((screen.getByLabelText("日本語") as HTMLInputElement).checked).toBe(true);
  });

  it("follows the browser by default, naming the language that gives", async () => {
    render(<SettingsPopup slot={fakeSlot(undefined)} preferredLanguages={["fr-FR", "ja"]} />);

    const auto = await screen.findByLabelText("ブラウザの設定に合わせる（日本語）");
    expect((auto as HTMLInputElement).checked).toBe(true);
  });

  it("saves a new choice and speaks it at once", async () => {
    const slot = fakeSlot("auto");
    render(<SettingsPopup slot={slot} preferredLanguages={["en-US"]} />);
    await screen.findByText("Display language");

    fireEvent.click(screen.getByLabelText("日本語"));

    await waitFor(() => expect(slot.saved).toEqual(["ja"]));
    expect(await screen.findByText("表示言語")).toBeTruthy();
  });
});
