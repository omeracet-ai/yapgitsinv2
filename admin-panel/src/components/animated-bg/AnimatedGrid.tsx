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

      {/* Gradient wash */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #0c1117 0%, #1a1f2e 50%, #0a3320 100%)",
          backgroundSize: "200% 200%",
          animation: "ygrid-shift 30s ease infinite",
          // M7 perf — promote to its own compositor layer so the 30s shift
          // does not invalidate the page during paint.
          willChange: "background-position",
        }}
      />

      {/* Dot grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #4ade80 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
    </>
  );
}
