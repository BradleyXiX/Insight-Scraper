/**
 * Dashboard navigation model.
 *
 * Icons are string keys, not components, so this module stays free of React and
 * `lucide-react` and can be exercised by `node --test`.
 */
export type NavIcon = "search" | "history" | "billing" | "settings";

export interface NavDestination {
  href: string;
  label: string;
  icon: NavIcon;
  exact?: boolean;
  hostedOnly?: boolean;
}

export const DESTINATIONS: NavDestination[] = [
  {
    href: "/dashboard",
    label: "New extraction",
    icon: "search",
    exact: true,
  },
  {
    href: "/dashboard/history",
    label: "History",
    icon: "history",
  },
  {
    href: "/dashboard/billing",
    label: "Billing and plans",
    icon: "billing",
    hostedOnly: true,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: "settings",
  },
];

/**
 * Which destinations a session may see.
 *
 * Billing is the only conditional item: a local operator has no subscription, and a
 * hosted session with no organization has no workspace to subscribe for.
 */
export function visibleDestinations(
  isLocal: boolean,
  orgId: string | null,
): NavDestination[] {
  return DESTINATIONS.filter((item) => {
    if (!item.hostedOnly) return true;
    if (isLocal) return false;
    return orgId !== null;
  });
}
