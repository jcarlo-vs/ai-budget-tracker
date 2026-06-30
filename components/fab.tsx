"use client";

export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Add expense"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-[0_10px_30px_-6px_var(--accent-glow)] transition-transform duration-150 active:scale-90"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
        strokeLinecap="round" className="h-6 w-6" aria-hidden>
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}
