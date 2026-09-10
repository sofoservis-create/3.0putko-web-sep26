import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import EditorStep from "./EditorSteps";

/** Step 8 wired to local state the way AccommodationForm wires it. */
function Harness({ initial }) {
  const [data, setData] = useState(initial);
  const setField = (key, value) => setData((current) => ({ ...current, [key]: value }));
  return (
    <>
      <EditorStep stepId="calendar" data={data} errors={{}} language="en" setField={setField} calendarLinkProps={null} />
      <output data-testid="choice">{data.calendarChoice ?? ""}</output>
      <output data-testid="feeds">{JSON.stringify(data.calendarFeeds ?? [])}</output>
    </>
  );
}

const withLinks = {
  calendarChoice: "connect",
  calendarFeeds: [
    { id: "f1", label: "Airbnb", url: "https://example.com/a.ics" },
    { id: "f2", label: "Booking", url: "https://example.com/b.ics" },
  ],
};

afterEach(cleanup);

describe("Editor step 8 — manual only vs connected links", () => {
  it("asks before pausing saved links and keeps them when the host declines", () => {
    render(<Harness initial={withLinks} />);
    fireEvent.click(screen.getByLabelText(/manual only/i));
    expect(screen.getByRole("alert").textContent).toMatch(/2 links stay saved but paused/i);
    expect(screen.getByTestId("choice").textContent).toBe("connect");
    // Focus lands on the safe choice so keyboard users can answer at once.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /keep connected/i }));

    fireEvent.click(screen.getByRole("button", { name: /keep connected/i }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("choice").textContent).toBe("connect");
    expect(screen.getByLabelText(/connect calendar links/i).checked).toBe(true);
  });

  it("pauses (never deletes) the links when the host confirms, and explains how to reconnect", () => {
    render(<Harness initial={withLinks} />);
    fireEvent.click(screen.getByLabelText(/manual only/i));
    fireEvent.click(screen.getByRole("button", { name: /switch to manual/i }));

    expect(screen.getByTestId("choice").textContent).toBe("none");
    expect(JSON.parse(screen.getByTestId("feeds").textContent)).toHaveLength(2);
    expect(screen.getByText(/2 saved calendar links are paused/i)).toBeTruthy();

    // Reconnecting needs no confirmation and shows the same links again.
    fireEvent.click(screen.getByLabelText(/connect calendar links/i));
    expect(screen.getByTestId("choice").textContent).toBe("connect");
    expect(screen.getByDisplayValue("https://example.com/a.ics")).toBeTruthy();
    expect(screen.getByDisplayValue("https://example.com/b.ics")).toBeTruthy();
  });

  it("switches to manual immediately when there is nothing to pause", () => {
    render(<Harness initial={{ calendarChoice: "connect", calendarFeeds: [{ label: "", url: "" }] }} />);
    fireEvent.click(screen.getByLabelText(/manual only/i));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("choice").textContent).toBe("none");
    expect(screen.getByText(/add calendar links later/i)).toBeTruthy();
  });

  it("Escape keeps the links connected and returns focus to the radio that opened the confirmation", () => {
    render(<Harness initial={withLinks} />);
    const manualRadio = screen.getByLabelText(/manual only/i);
    manualRadio.focus();
    fireEvent.click(manualRadio);
    const keep = screen.getByRole("button", { name: /keep connected/i });
    expect(document.activeElement).toBe(keep);

    fireEvent.keyDown(keep, { key: "Escape" });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("choice").textContent).toBe("connect");
    expect(document.activeElement).toBe(manualRadio);
  });
});
