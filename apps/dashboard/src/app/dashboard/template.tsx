"use client";

import React, { useEffect, useState } from "react";

export default function Template({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [mounted, setMounted] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setIsReducedMotion(reduced);
      if (!reduced) {
        // Trigger the transition on the next animation frame
        const raf = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(raf);
      }
    }
  }, []);

  if (isReducedMotion) {
    return <div className="w-full h-full">{children}</div>;
  }

  return (
    <div
      className="w-full h-full"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(8px)",
        transition:
          "opacity 300ms cubic-bezier(0.22, 1, 0.36, 1), transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {children}
    </div>
  );
}

