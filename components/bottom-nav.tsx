"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLinkProgress } from "@/components/route-progress";

type IconProps = { className?: string };

function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m3 10.2 9-7 9 7V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20z" />
      <path d="M9.2 21.5v-7h5.6v7" />
    </svg>
  );
}

function SavingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M19 5.5c-1.4 0-2.6 1-3 2-3.4-1.3-11-.3-11 5 0 1.7.7 3 2 4.2V20h3.2v-1.8h3.6V20H20v-3.8c.7-.5 1.2-1.1 1.5-1.9H23v-3.5h-1.6c-.3-.7-.8-1.3-1.4-1.8z" />
      <path d="M3 10.5c-.6 0-1 .5-1 1.2v.6c0 .8.6 1.4 1.4 1.4H4" />
      <path d="M15.5 9.2h.01" />
    </svg>
  );
}

function ManageIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 5h9" />
      <path d="M18 5h1" />
      <path d="M5 12h1" />
      <path d="M10 12h9" />
      <path d="M5 19h6" />
      <path d="M15 19h4" />
      <circle cx="16" cy="5" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="13" cy="19" r="2" />
    </svg>
  );
}

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/savings", label: "Savings", Icon: SavingsIcon },
  { href: "/categories", label: "Manage", Icon: ManageIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname.startsWith("/themes")) return null;

  return (
    <nav className="navbar fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={`group relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium transition-colors ${
                active ? "text-accent" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <NavLinkProgress />
              {active && (
                <span
                  aria-hidden
                  className="absolute -top-px h-0.5 w-9 rounded-full bg-accent shadow-[0_0_10px_var(--accent-glow)]"
                />
              )}
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-accent/15 shadow-[0_0_18px_-4px_var(--accent-glow)]"
                    : "group-active:scale-90"
                }`}
              >
                <Icon className="h-[22px] w-[22px]" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
