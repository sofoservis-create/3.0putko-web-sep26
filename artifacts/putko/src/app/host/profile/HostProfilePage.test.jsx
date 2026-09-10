import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../utlis/guestAccountApi", () => ({
  getHostProfile: vi.fn(),
  saveHostProfile: vi.fn(),
}));

import { getHostProfile, saveHostProfile } from "../../utlis/guestAccountApi";
import HostProfilePage from "./HostProfilePage";

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const unsavedDefault = { displayName: "Jana", avatarUrl: null, about: "", languages: [], responseTime: null, savedAt: null };
const persisted = { ...unsavedDefault, savedAt: "2026-09-10T02:00:00.000Z" };

const renderPage = async () => {
  render(<HostProfilePage language="en" onOpenAccount={() => {}} />);
  await screen.findByRole("button", { name: "Save profile" });
};
const savedStatus = () =>
  waitFor(() => {
    const status = screen.getAllByRole("status").find((node) => /^Saved/.test(node.textContent.trim()));
    expect(status).toBeTruthy();
  });
const clickSave = () => fireEvent.click(screen.getByRole("button", { name: /Save profile|Retry save/ }));

beforeEach(() => {
  getHostProfile.mockReset();
  saveHostProfile.mockReset();
});
afterEach(cleanup);

describe("HostProfilePage save lifecycle", () => {
  it("persists the first save even when the suggested default is accepted unchanged", async () => {
    getHostProfile.mockResolvedValue({ profile: unsavedDefault });
    saveHostProfile.mockResolvedValue({ profile: persisted });
    await renderPage();
    expect(screen.getByText("Not saved yet")).toBeTruthy();

    clickSave();

    await waitFor(() => expect(saveHostProfile).toHaveBeenCalledTimes(1));
    expect(saveHostProfile).toHaveBeenCalledWith({ displayName: "Jana", avatarUrl: null, about: "", languages: [], responseTime: null });
    await savedStatus();
  });

  it("skips the request when an already persisted profile is saved without edits", async () => {
    getHostProfile.mockResolvedValue({ profile: persisted });
    await renderPage();

    clickSave();

    await savedStatus();
    expect(saveHostProfile).not.toHaveBeenCalled();
  });

  it("shows inline errors and sends nothing when the name is empty", async () => {
    getHostProfile.mockResolvedValue({ profile: persisted });
    await renderPage();

    fireEvent.change(screen.getByLabelText("Public name"), { target: { value: " " } });
    clickSave();

    await screen.findByText("Enter the name travellers will see.");
    expect(saveHostProfile).not.toHaveBeenCalled();
  });

  it("ignores a second click while a save is in flight", async () => {
    getHostProfile.mockResolvedValue({ profile: persisted });
    const pending = deferred();
    saveHostProfile.mockReturnValue(pending.promise);
    await renderPage();

    fireEvent.change(screen.getByLabelText("About you"), { target: { value: "Welcome" } });
    clickSave();
    await screen.findByText("Saving your profile…");
    expect(screen.getByRole("button", { name: /Saving/ }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Saving/ }));
    expect(saveHostProfile).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ profile: { ...persisted, about: "Welcome", savedAt: "2026-09-10T02:05:00.000Z" } });
    });
    await savedStatus();
  });

  it("keeps the edits and offers Retry after a failed save, then saves on retry", async () => {
    getHostProfile.mockResolvedValue({ profile: persisted });
    saveHostProfile.mockRejectedValueOnce(Object.assign(new Error("boom"), { status: 500 }));
    await renderPage();

    fireEvent.change(screen.getByLabelText("About you"), { target: { value: "Welcome" } });
    clickSave();

    await screen.findByText(/Not saved\./);
    expect(screen.getByLabelText("About you").value).toBe("Welcome");
    expect(screen.getByRole("button", { name: "Retry save" })).toBeTruthy();

    saveHostProfile.mockResolvedValueOnce({ profile: { ...persisted, about: "Welcome", savedAt: "2026-09-10T02:06:00.000Z" } });
    clickSave();
    await savedStatus();
    expect(saveHostProfile).toHaveBeenCalledTimes(2);
  });

  it("maps server field errors onto the form", async () => {
    getHostProfile.mockResolvedValue({ profile: persisted });
    saveHostProfile.mockRejectedValueOnce(
      Object.assign(new Error("Invalid host profile"), { status: 400, data: { errors: [{ field: "avatarUrl", code: "invalidUrl" }] } }),
    );
    await renderPage();

    // Passes client validation but the server rejects it.
    fireEvent.change(screen.getByLabelText("Profile photo link"), { target: { value: "https://example.com/not-an-image" } });
    clickSave();

    await screen.findByText("Enter a full image link starting with https://.");
    await screen.findByText("Fix the highlighted fields, then save again.");
  });
});
