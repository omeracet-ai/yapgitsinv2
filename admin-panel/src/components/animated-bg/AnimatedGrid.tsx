"use client";

/**
 * AnimatedGrid — cinematic admin backdrop. Pure CSS, zero deps. Mounted once
 * by the admin layout; sits behind every page content (z-0) and ignores
 * pointer events so clicks/taps fall through to the UI above.
 *
 * Two layers stacked:
 *   1. A slow gradient wash (slate → emerald) that drifts on a 30s loop.
 *   2. A subtle radial-dot grid for depth.
 *
 * Both have very low opacity to stay tasteful and not fight the foreground.
 */

export function AnimatedGrid() {
  return (
    <>
      <style jsx global>{`
        @keyframes ygrid-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Gradient wash — Yaprakzade green + gold tints, very subtle */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: -2,
          backgroundImage:
            "linear-gradient(135deg, #0c1117 0%, #131b25 50%, #0f1e17 100%)",
          backgroundSize: "200% 200%",
          animation: "ygrid-shift 30s ease infinite",
          willChange: "background-position",
          opacity: 0.5,
        }}
      />

      {/* Dot grid overlay — gold tint, lowered to 0.025 */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: -2,
          opacity: 0.025,
          backgroundImage:
            "radial-gradient(circle, #c9a96e 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
    </>
  );
}
