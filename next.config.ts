import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Allow accessing the dev server from this machine's LAN IP (e.g. from a phone
  // on the same Wi-Fi). Next 16 blocks cross-origin dev assets/HMR otherwise.
  // If your LAN IP changes (DHCP), update this value.
  allowedDevOrigins: ["192.168.100.112"],
};

export default withSerwist(nextConfig);
