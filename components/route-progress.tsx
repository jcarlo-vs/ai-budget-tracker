"use client";

import { useLinkStatus } from "next/link";

/**
 * Documented mount point in the root layout. `useLinkStatus` only reports a
 * pending state from inside a `<Link>` descendant, so the actual bar is rendered
 * by `NavLinkProgress` within each bottom-nav link; this stays a no-op anchor.
 */
export function RouteProgress() {
  return null;
}

/**
 * Renders the slim top progress bar while its parent `<Link>` navigation is
 * pending. Must be a descendant of a `<Link>` (Next 16 `useLinkStatus` rule).
 */
export function NavLinkProgress() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span aria-hidden className="route-progress" />;
}
