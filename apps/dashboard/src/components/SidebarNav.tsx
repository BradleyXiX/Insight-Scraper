"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, History, CreditCard, Settings } from "lucide-react";
import { useAppAuth } from "@/lib/app-auth";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { visibleDestinations, type NavIcon } from "@/lib/nav";

export interface SidebarNavProps {
  onNavigate?: () => void;
  stagger?: boolean;
}

const ICONS: Record<
  NavIcon,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  search: Search,
  history: History,
  billing: CreditCard,
  settings: Settings,
};

export function SidebarNav({ onNavigate, stagger = false }: SidebarNavProps): React.ReactElement {
  const pathname = usePathname();
  const isReducedMotion = useReducedMotion();
  const { isLocal, orgId } = useAppAuth();

  const destinations = visibleDestinations(isLocal, orgId);

  return (
    <nav className="flex flex-col gap-1 w-full" aria-label="Dashboard navigation">
      <div className="text-xs uppercase tracking-wider font-mono text-foreground/60 px-3 py-2">
        Navigation
      </div>
      {destinations.map((item, index) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = ICONS[item.icon];

        const staggerStyle =
          stagger && !isReducedMotion
            ? {
                transitionDelay: `${index * 60}ms`,
                transitionProperty: "transform, opacity, color, background-color",
                transitionDuration: "300ms",
                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              }
            : undefined;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => onNavigate?.()}
            style={staggerStyle}
            className={`relative flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors ${
              isActive
                ? "bg-accent-quiet text-accent font-medium"
                : "text-foreground/70 hover:text-white hover:bg-surface-hover"
            }`}
          >
            {/* 2px accent bar flush to the left edge */}
            {isActive && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent" />}
            <Icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default SidebarNav;
