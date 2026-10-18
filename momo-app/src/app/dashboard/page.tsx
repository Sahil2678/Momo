import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  manifest: "/dashboard-manifest.webmanifest",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
