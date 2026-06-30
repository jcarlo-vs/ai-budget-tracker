import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RouteHandlerCallback, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, Serwist } from "serwist";

// Augment ServiceWorkerGlobalScope with the build-time injected precache manifest.
declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const manifest = self.__SW_MANIFEST ?? [];

// `@serwist/next` injects only hashed assets (JS chunks, CSS, public files) into
// the manifest — it never precaches page *documents*. So an offline navigation to
// a route the user never visited (e.g. `/category?id=<uuid>`) has nothing to fall
// back to and the SW returns `no-response`. We fix that by precaching the static
// route documents ourselves below.
//
// These documents reference the build's hashed JS chunks, which rotate every
// deploy, so we tag them with a revision derived from the manifest. That revision
// changes whenever any asset changes, forcing the precached shells to be re-fetched
// on the next SW update (otherwise a stale shell would point at deleted chunks).
const buildRevision = (() => {
  const json = JSON.stringify(manifest);
  let hash = 5381;
  for (let i = 0; i < json.length; i++) {
    hash = ((hash << 5) + hash + json.charCodeAt(i)) >>> 0; // djb2
  }
  return hash.toString(36);
})();

// Every navigable, statically-prerendered (`○`) route. `/category` is the static
// `?id=` route (its document serves any `id`); `/login` is omitted because it only
// server-redirects home. Anything not listed still falls back to the precached `/`.
const STATIC_DOCUMENTS = ["/", "/category", "/categories", "/savings", "/themes"];

const documentEntries: PrecacheEntry[] = STATIC_DOCUMENTS.map((url) => ({ url, revision: buildRevision }));

const isApi = (pathname: string) => pathname.startsWith("/api/");

// NetworkFirst for top-level navigations (document requests), prepended ahead of
// `defaultCache` so it wins. Keeps documents fresh online and seeds the runtime
// cache; offline it rejects and hands off to the catch handler below. `/api/*` is
// excluded so the sync endpoint always hits the network (and 401s) normally.
const navigationCaching: RuntimeCaching = {
  matcher: ({ request, url, sameOrigin }) =>
    request.mode === "navigate" && sameOrigin && !isApi(url.pathname),
  handler: new NetworkFirst({ cacheName: "pages", networkTimeoutSeconds: 10 }),
};

const serwist = new Serwist({
  precacheEntries: [...manifest, ...documentEntries],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [navigationCaching, ...defaultCache],
});

// Last-resort handler: if a route (e.g. the navigation NetworkFirst above) throws
// because we're offline with nothing cached, serve a precached document instead of
// letting `respondWith` reject with `no-response`. We match the request's pathname
// with the search ignored, so `/category?id=<uuid>` resolves to the precached
// `/category` shell, then fall back to the precached `/`. The client re-renders the
// route from Dexie once the shell loads, so every in-app route opens offline.
const catchHandler: RouteHandlerCallback = async ({ request }) => {
  if (request.destination === "document") {
    const { pathname } = new URL(request.url);
    const byPathname = await serwist.matchPrecache(pathname);
    if (byPathname) return byPathname;

    const home = await serwist.matchPrecache("/");
    if (home) return home;
  }
  // Non-document requests (and the impossible case of a missing home shell) get a
  // network error rather than a misleading document body.
  return Response.error();
};

serwist.setCatchHandler(catchHandler);

serwist.addEventListeners();
