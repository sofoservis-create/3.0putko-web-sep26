import { useEffect, useState } from "react";

/**
 * Height (px) of the part of the layout viewport currently covered by the
 * on-screen keyboard. Fixed-position bars use it as their `bottom` offset so
 * they stay visible above the keyboard on iOS/Android browsers, which shrink
 * the visual viewport without moving fixed elements. 0 when unknown.
 */
export default function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return undefined;
    const viewport = window.visualViewport;
    const update = () => {
      const covered = window.innerHeight - (viewport.height + viewport.offsetTop);
      // Ignore sub-40px differences (browser chrome resizing) so the bar does
      // not jitter while scrolling.
      setInset(covered > 40 ? Math.round(covered) : 0);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
