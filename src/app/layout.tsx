import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AutoRefresh } from "@/components/AutoRefresh";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reimbursify",
  description: "A modern expense reimbursement portal for employees and finance teams.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Reimbursify",
  },
};

export const viewport: Viewport = {
  themeColor: "#0077b6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ServiceWorkerRegister />
          <AutoRefresh />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

