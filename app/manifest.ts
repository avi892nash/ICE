import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ICE Demo — Interactive Connectivity Establishment",
    short_name: "ICE Demo",
    description:
      "WebRTC ICE protocol explained with a live two-peer demo, candidate explorer, and an animated algorithm simulator.",
    start_url: "/",
    display: "standalone",
    background_color: "#f0f9ff",
    theme_color: "#0284c7",
    orientation: "portrait-primary",
    categories: ["education", "developer", "utilities"],
    icons: [
      {
        src: "/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/favicon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
