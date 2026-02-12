import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vad blir det till middag?",
    short_name: "Foodish",
    description: "Veckoplanering av middagar på under en minut",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#D8654B",
    icons: [
      {
        src: "/food-plate-1.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/food-plate-2.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/food-plate-3.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
