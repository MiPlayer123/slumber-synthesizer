import { Helmet } from "react-helmet-async";

interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export const Seo = ({
  title = "Rem",
  description = "Track your sleep patterns, record dreams and improve your sleep quality with REM sleep tracker and dream journal.",
  canonical = "",
  ogImage = "/images/preview_image.png",
  noIndex = false,
}: SeoProps) => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lucidrem.com";
  const fullUrl = canonical ? `${siteUrl}${canonical}` : siteUrl;
  const fullTitle = title.includes("REM") ? title : `${title} | REM`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex" />}
      <link rel="canonical" href={fullUrl} />

      {/* Content Security Policy */}
      <meta
        httpEquiv="Content-Security-Policy"
        content="style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:;"
      />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${siteUrl}${ogImage}`} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={`${siteUrl}${ogImage}`} />
    </Helmet>
  );
};
