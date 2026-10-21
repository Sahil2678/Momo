import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { PwaRegister } from "@/components/PwaRegister";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0e0a08",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "RK MOMO — Readymade MOMO",
  description: "Order fresh, handcrafted momos online from RK MOMO.",
  manifest: "/manifest.webmanifest",
  applicationName: "RK MOMO",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RK MOMO",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0e0a08] text-zinc-100 min-h-screen`}>
        <CartProvider>
          {children}
          <PwaRegister />
        </CartProvider>
      </body>
    </html>
  );
}