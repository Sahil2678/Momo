import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { PwaRegister } from "@/components/PwaRegister";
import { SplashScreen } from "@/components/SplashScreen";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "RK MOMO — Handcrafted MOMO",
  description: "Order fresh, artisan steamed, crispy kurkure, and tandoori momos online with real-time checkout.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RK MOMO",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0e0a08] text-zinc-100 min-h-screen`}>
        <CartProvider>
          <SplashScreen>
            {children}
            <PwaRegister />
          </SplashScreen>
        </CartProvider>
      </body>
    </html>
  );
}