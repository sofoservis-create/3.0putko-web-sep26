"use client";

import HeroSection from "./HeroSection";

export default function AnimatedHero() {
  return (
    <div
      className="relative w-full bg-[#FFFEF9]"
      style={{ isolation: "isolate" }}
    >
      {/* Light aesthetic background with brand-colored subtle gradients */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden">
        {/* Soft green glow top right */}
        <div
          className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] rounded-full opacity-30 mix-blend-multiply blur-[120px]"
          style={{
            background: "radial-gradient(circle, rgba(79,190,159,0.8) 0%, rgba(255,255,255,0) 70%)",
          }}
        />
        {/* Soft dark green accent bottom left */}
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-10 mix-blend-multiply blur-[100px]"
          style={{
            background: "radial-gradient(circle, rgba(35,136,105,0.8) 0%, rgba(255,255,255,0) 70%)",
          }}
        />
        {/* Very subtle noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.015]" 
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }}
        />
      </div>

      {/* Full-width hero shell; HeroSection constrains its foreground content. */}
      <div className="relative z-10 w-full">
        <HeroSection />
      </div>
    </div>
  );
}


