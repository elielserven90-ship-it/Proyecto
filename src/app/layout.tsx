import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "POS UPTPC · Cantina Universitaria",
  description:
    "Sistema de punto de venta de la Cantina de la Universidad Politécnica Territorial de Puerto Cabello (UPTPC). Vendedores, productos, ventas e informes.",
  keywords: ["POS", "UPTPC", "Cantina", "Puerto Cabello", "Venezuela"],
  icons: {
    icon: "/logos/logo_uptpc.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <Providers>{children}</Providers>
        <Toaster richColors position="top-center" closeButton />
      </body>
    </html>
  );
}
