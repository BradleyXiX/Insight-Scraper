"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { isLocalMode, localApiToken, operatorLabel } from "@/lib/auth-mode";

/**
 * A single auth surface for both run modes.
 *
 * Components must not import `useAuth` from Clerk directly: in local mode there is no
 * `ClerkProvider`, and Clerk hooks throw without one. `useAppAuth` returns the same
 * shape in both modes, so a page never has to branch on auth provider.
 */
export interface AppAuth {
  isLocal: boolean;
  orgId: string | null;
  operatorLabel: string;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AppAuth | null>(null);

const LOCAL_AUTH: AppAuth = {
  isLocal: true,
  orgId: "local_operator",
  operatorLabel,
  getToken: async () => localApiToken,
};

export function AppAuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  // This component calls no hooks, so returning before the Clerk bridge is safe.
  if (isLocalMode) {
    return <AuthContext.Provider value={LOCAL_AUTH}>{children}</AuthContext.Provider>;
  }
  return <ClerkAuthBridge>{children}</ClerkAuthBridge>;
}

function ClerkAuthBridge({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { getToken, orgId } = useAuth();

  const value = useMemo<AppAuth>(
    () => ({
      isLocal: false,
      orgId: orgId ?? null,
      operatorLabel: "Workspace",
      getToken: () => getToken(),
    }),
    [getToken, orgId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAppAuth(): AppAuth {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAppAuth must be used inside AppAuthProvider");
  }
  return value;
}
