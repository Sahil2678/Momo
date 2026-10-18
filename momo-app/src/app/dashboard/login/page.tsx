import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
};

export default function DashboardLoginPage() {
  return <LoginClient />;
}
