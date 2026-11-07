"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { AppAuthProvider } from "@/lib/app-auth";
import { isLocalMode } from "@/lib/auth-mode";
import { clerkAppearance } from "@/lib/clerk-appearance";

/**
 * Conditional provider tree.
 *
 * Local mode renders no Clerk provider at all: the app must boot with no Clerk keys
 * and no Clerk network traffic. Hosted mode keeps the themed provider.
 */
export function Providers({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  if (isLocalMode) {
    return <AppAuthProvider>{children}</AppAuthProvider>;
  }

  return (
    <ClerkProvider appearance={clerkAppearance}>
      <AppAuthProvider>{children}</AppAuthProvider>
    </ClerkProvider>
  );
}

export default Providers;
