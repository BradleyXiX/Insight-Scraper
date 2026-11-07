"use client";

import React from "react";

/**
 * Route-level entrance. Pure CSS so there is no mount state, no flash of hidden
 * content, and reduced-motion users get the final state immediately.
 */
export default function Template({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="w-full h-full dashboard-enter">
      <style>{`
        @keyframes dashboard-enter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dashboard-enter {
          animation: dashboard-enter 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .dashboard-enter { animation: none; }
        }
      `}</style>
      {children}
    </div>
  );
}
