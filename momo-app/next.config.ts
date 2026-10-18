import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/order": ["./node_modules/pdfkit/js/standard-fonts/**/*"],
    "/api/orders/[id]/receipt": ["./node_modules/pdfkit/js/standard-fonts/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
