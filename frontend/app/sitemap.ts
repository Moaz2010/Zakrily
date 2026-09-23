import type { MetadataRoute } from "next";

const SITE_URL = "https://zakrily.iqraxis.com";

// Only the public landing page is meaningfully indexable; every other route
// sits behind sign-in (see robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
