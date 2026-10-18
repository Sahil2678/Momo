import type { MetadataRoute } from "next";
import { SplashScreen } from "@/components/SplashScreen";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "",
    short_name: "",
    description: "Fresh RK MOMO Wholesale & Retail Ordering Platform",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0a08",
    theme_color: "#f59e0b",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
