import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api", "/design-system", "/en/dashboard", "/ar/dashboard", "/en/admin", "/ar/admin", "/en/design-system", "/ar/design-system"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
