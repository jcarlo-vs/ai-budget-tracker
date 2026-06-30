import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow accessing the dev server from this machine's LAN IP (e.g. from a phone
  // on the same Wi-Fi). Next 16 blocks cross-origin dev assets/HMR otherwise.
  // If your LAN IP changes (DHCP), update this value.
  allowedDevOrigins: ["192.168.100.112"],
};

export default nextConfig;
