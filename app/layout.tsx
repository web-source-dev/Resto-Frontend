import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@dinova/components/AppShell";
import { PwaBootstrap } from "@dinova/components/PwaBootstrap";
import { AuthProvider } from "@dinova/lib/AuthProvider";
import { SocketProvider } from "@dinova/lib/SocketProvider";
import { ToastProvider } from "@dinova/components/Toaster";

export const metadata: Metadata = {
  applicationName: "Dinova",
  title: {
    default: "Dinova — Smart Restaurant Solution",
    template: "%s · Dinova",
  },
  description:
    "Dinova — smart restaurant operations for orders, kitchen, inventory, staff, and revenue.",
  manifest: "/manifest.webmanifest",
  themeColor: "#f58220",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      {
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Dinova",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <PwaBootstrap />
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
