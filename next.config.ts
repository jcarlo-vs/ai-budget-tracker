import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Allow accessing the dev server from this machine's LAN IP (e.g. from a phone
  // on the same Wi-Fi). Next 16 blocks cross-origin dev assets/HMR otherwise.
  // If your LAN IP changes (DHCP), update this value.
  allowedDevOrigins: ["192.168.100.112"],
};

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: isDev,
});

// In dev, skip the Serwist wrapper entirely — its webpack config clashes with
// Next 16's default Turbopack dev server. The production build (`next build
// --webpack`) applies Serwist and generates the service worker.
export default isDev ? nextConfig : withSerwist(nextConfig);
