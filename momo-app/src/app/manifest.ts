import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "RK MOMO",
    short_name: "RK MOMO",
    description: "Fresh RK MOMO Wholesale & Retail Ordering Platform",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0e0a08",
    theme_color: "#0e0a08",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
