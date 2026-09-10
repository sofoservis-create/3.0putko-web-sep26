import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../utlis/guestAccountApi", () => ({
  getHostProfile: vi.fn(),
  saveHostProfile: vi.fn(),
  prepareHostProfilePhoto: vi.fn(),
  discardHostProfilePhoto: vi.fn(() => Promise.resolve()),
}));

import { discardHostProfilePhoto, getHostProfile, prepareHostProfilePhoto, saveHostProfile } from "../../utlis/guestAccountApi";
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
  prepareHostProfilePhoto.mockReset();
  discardHostProfilePhoto.mockClear();
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:photo"),
    revokeObjectURL: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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

  it("removes the raw photo URL input", async () => {
    getHostProfile.mockResolvedValue({ profile: persisted });
    await renderPage();
    expect(screen.queryByLabelText("Profile photo link")).toBeNull();
    expect(screen.getByRole("button", { name: "Take photo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choose photo" })).toBeTruthy();
  });

  it("prepares a chosen photo and saves its managed reference without losing other edits", async () => {
    const avatarUrl = "/api/test-auth/host-profile-photo/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/avatar.webp";
    getHostProfile.mockResolvedValue({ profile: persisted });
    prepareHostProfilePhoto.mockResolvedValue({ avatarUrl, profileUrl: avatarUrl.replace("avatar.webp", "profile.webp") });
    saveHostProfile.mockResolvedValue({ profile: { ...persisted, about: "Welcome", avatarUrl, savedAt: "2026-09-10T03:00:00.000Z" } });
    await renderPage();
    fireEvent.change(screen.getByLabelText("About you"), { target: { value: "Welcome" } });

    const gallery = document.querySelector('input[type="file"]:not([capture])');
    const file = new File(["photo"], "host.jpg", { type: "image/jpeg" });
    fireEvent.change(gallery, { target: { files: [file] } });
    await screen.findByRole("dialog", { name: "Crop profile photo" });
    fireEvent.click(screen.getByRole("button", { name: "Use this photo" }));

    await waitFor(() => expect(prepareHostProfilePhoto).toHaveBeenCalledWith(file, { x: 0.5, y: 0.5, size: 1 }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByLabelText("About you").value).toBe("Welcome");
    await waitFor(() => expect(screen.getByRole("button", { name: "Save profile" }).disabled).toBe(false));
    clickSave();
    await waitFor(() => expect(saveHostProfile).toHaveBeenCalledWith(expect.objectContaining({ avatarUrl, about: "Welcome" })));
  });

  it("locks photo removal while a save referencing the prepared draft is in flight", async () => {
    const avatarUrl = "/api/test-auth/host-profile-photo/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/avatar.webp";
    const pending = deferred();
    getHostProfile.mockResolvedValue({ profile: persisted });
    prepareHostProfilePhoto.mockResolvedValue({ avatarUrl, profileUrl: avatarUrl.replace("avatar.webp", "profile.webp") });
    saveHostProfile.mockReturnValue(pending.promise);
    await renderPage();

    const gallery = document.querySelector('input[type="file"]:not([capture])');
    const file = new File(["photo"], "host.jpg", { type: "image/jpeg" });
    fireEvent.change(gallery, { target: { files: [file] } });
    await screen.findByRole("dialog", { name: "Crop profile photo" });
    fireEvent.click(screen.getByRole("button", { name: "Use this photo" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(screen.getByRole("button", { name: "Save profile" }).disabled).toBe(false));

    clickSave();
    await screen.findByText("Saving your profile…");
    const remove = screen.getByRole("button", { name: "Remove" });
    expect(remove.disabled).toBe(true);
    fireEvent.click(remove);
    expect(discardHostProfilePhoto).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ profile: { ...persisted, avatarUrl, savedAt: "2026-09-10T03:10:00.000Z" } });
    });
    await savedStatus();
    expect(screen.getByRole("button", { name: "Remove" }).disabled).toBe(false);
  });
});
