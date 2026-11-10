import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
    const siteUrl = getSiteUrl();

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/*/profile",
                    "/*/profile/",
                    "/*/lifeos",
                    "/*/lifeos/",
                    "/*/notifications",
                    "/*/notifications/",
                    "/*/manage",
                    "/*/manage/",
                    "/*/admin",
                    "/*/admin/",
                    "/*/devices",
                    "/*/devices/",
                    "/api/",
                ],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    };
}
