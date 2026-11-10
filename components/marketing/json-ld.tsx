import { SITE_NAME, getSiteUrl } from "@/lib/seo";

type JsonLdProps = {
    locale: string;
    name: string;
    description: string;
};

export function SiteJsonLd({ locale, name, description }: JsonLdProps) {
    const siteUrl = getSiteUrl();
    const payload = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                name: SITE_NAME,
                url: `${siteUrl}/${locale}`,
                description,
                inLanguage: locale,
                publisher: {
                    "@type": "Organization",
                    name: SITE_NAME,
                    url: siteUrl,
                },
            },
            {
                "@type": "SoftwareApplication",
                name,
                applicationCategory: "LifestyleApplication",
                operatingSystem: "Web",
                description,
                url: `${siteUrl}/${locale}`,
            },
        ],
    };

    return (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }} />
    );
}
