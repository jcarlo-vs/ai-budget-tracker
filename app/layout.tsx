import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { RouteProgress } from "@/components/route-progress";
import "./globals.css";

export const metadata: Metadata = {
  title: "Budget Tracker",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Budget" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh safe-top">
        <RouteProgress />
        {children}
        <BottomNav />
        <Toaster position="top-center" richColors theme="dark" />
      </body>
    </html>
  );
}
