import type { MetadataRoute } from "next";

const SITE_URL = "https://avi892nash.github.io/ICE";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFreq: "monthly" },
    { path: "/algorithm", priority: 0.9, changeFreq: "monthly" },
    { path: "/demo", priority: 0.9, changeFreq: "monthly" },
    { path: "/candidates", priority: 0.7, changeFreq: "monthly" },
    { path: "/limitations", priority: 0.7, changeFreq: "monthly" },
  ];
  return routes.map(({ path, priority, changeFreq }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: changeFreq,
    priority,
  }));
}
