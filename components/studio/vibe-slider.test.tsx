// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { domMax, LazyMotion } from "framer-motion";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VibeSlider } from "./vibe-slider";

const motionFeatures = domMax;

afterEach(cleanup);

describe("VibeSlider keyboard navigation", () => {
  it("moves focus and the checked value with right and left arrows", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <LazyMotion features={motionFeatures}>
        <VibeSlider value="film-student" onChange={onChange} />
      </LazyMotion>,
    );

    const first = screen.getByRole("radio", { name: "Film student" });
    first.focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenLastCalledWith("shitposter");
    expect(screen.getByRole("radio", { name: "Shitposter" })).toHaveFocus();

    rerender(
      <LazyMotion features={motionFeatures}>
        <VibeSlider value="shitposter" onChange={onChange} />
      </LazyMotion>,
    );
    fireEvent.keyDown(screen.getByRole("radio", { name: "Shitposter" }), { key: "ArrowLeft" });

    expect(onChange).toHaveBeenLastCalledWith("film-student");
    expect(screen.getByRole("radio", { name: "Film student" })).toHaveFocus();
  });

  it("keeps one tab stop and supports Home and End", () => {
    const onChange = vi.fn();
    render(
      <LazyMotion features={motionFeatures}>
        <VibeSlider value="film-student" onChange={onChange} />
      </LazyMotion>,
    );

    expect(screen.getAllByRole("radio").filter((radio) => radio.getAttribute("tabindex") === "0"))
      .toHaveLength(1);
    fireEvent.keyDown(screen.getByRole("radio", { name: "Film student" }), { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("conspiracy");
    expect(screen.getByRole("radio", { name: "Conspiracy theorist" })).toHaveFocus();
  });

  it("keeps bonus vibes locked until their roast threshold and then enables them", () => {
    const onChange = vi.fn();
    const { rerender } = render(<VibeSlider value="film-student" onChange={onChange} totalRoasts={4} />);
    const sports = screen.getByRole("radio", { name: "Sports commentator, locked, unlocks after 5 roasts" });
    expect(sports).toBeDisabled();

    rerender(<VibeSlider value="film-student" onChange={onChange} totalRoasts={5} />);
    const unlockedSports = screen.getByRole("radio", { name: "Sports commentator" });
    expect(unlockedSports).toBeEnabled();
    fireEvent.click(unlockedSports);
    expect(onChange).toHaveBeenCalledWith("sports");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Film student" }), { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("sports");
    expect(unlockedSports).toHaveFocus();
  });
});
