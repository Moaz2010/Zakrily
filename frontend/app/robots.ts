import type { MetadataRoute } from "next";

const SITE_URL = "https://zakrily.iqraxis.com";

// Everything past "/" requires a signed-in account, so there is nothing for a
// crawler to usefully index beyond the landing page itself.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/home", "/lessons", "/profile", "/leaderboard"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
