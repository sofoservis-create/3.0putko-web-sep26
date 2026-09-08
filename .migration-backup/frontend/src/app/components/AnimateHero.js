"use client";

import Image from "next/image";
import HeroSection from "./HeroSection";

export default function AnimatedHero() {
  return (
    <div
      className="relative w-full"
      style={{ isolation: "isolate" }}
    >
      {/* Photo layer */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        {/* Mobile */}
        <div className="absolute inset-0 lg:hidden">
          <Image
            src="/mobile.avif"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[20%_50%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/75" />
        </div>

        {/* Desktop — positioned far-left to show landscape, not the mascot */}
        <div className="absolute inset-0 hidden lg:block">
          <Image
            src="/lgbackgroud.avif"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[12%_55%]"
          />
          {/* Dark gradient overlay — heavier at top for text legibility */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,30,20,0.72) 0%, rgba(10,30,20,0.58) 50%, rgba(10,30,20,0.68) 100%)",
            }}
          />
          {/* Right-side gradient — fades mascot, keeps landscape readable */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, transparent 0%, transparent 45%, rgba(5,20,13,0.55) 70%, rgba(5,20,13,0.80) 100%)",
            }}
          />
          {/* Subtle green tint on left third to anchor brand */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 80% at 10% 50%, rgba(35,136,105,0.18) 0%, transparent 70%)",
            }}
          />
        </div>
      </div>

      {/* Content limited to 1440px */}
      <div className="relative z-10 max-w-[1440px] mx-auto w-full">
        <HeroSection />
      </div>
    </div>
  );
}
