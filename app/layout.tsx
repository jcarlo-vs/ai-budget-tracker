import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { RouteProgress } from "@/components/route-progress";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Budget Tracker",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Budget" },
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="min-h-dvh safe-top">
        <RouteProgress />
        {children}
        <BottomNav />
        <Toaster position="top-center" richColors theme="dark" />
      </body>
    </html>
  );
}
