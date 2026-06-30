// Fired after every local write so <SyncProvider> can debounce a background sync.
// Guarded for non-browser environments (SSR / tests without a window).
export const LOCAL_MUTATION_EVENT = "local-mutation";

export function touch(): void {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(LOCAL_MUTATION_EVENT));
  }
}
