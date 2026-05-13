import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Props for the {@link Seo} component used to manage page-level metadata.
 *
 * - `title` – Sets the document title.
 * - `description` – Updates the standard meta description tag.
 * - `canonicalUrl` – Adds or updates a canonical link element.
 * - `openGraph` – Key/value pairs for Open Graph meta tags (e.g. `title`,
 *   `description`, `image`).
 * - `twitter` – Key/value pairs for Twitter card meta tags (e.g. `card`,
 *   `title`, `description`, `image`).
 * - `jsonLd` – Structured data object injected as JSON-LD.
 * - `schemaId` – Optional ID for the JSON-LD script element.
 */
interface SeoProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  openGraph?: Record<string, string | undefined>;
  twitter?: Record<string, string | undefined>;
  jsonLd?: Record<string, any>;
  schemaId?: string;
  robots?: string;
}

const Seo: React.FC<SeoProps> = ({
  title,
  description,
  canonicalUrl,
  openGraph,
  twitter,
  jsonLd,
  schemaId,
  robots,
}) => {
  const openGraphEntries = Object.entries(openGraph ?? {}).filter(([, value]) => Boolean(value));
  const twitterEntries = Object.entries(twitter ?? {}).filter(([, value]) => Boolean(value));

  const jsonLdContent = jsonLd ? JSON.stringify(jsonLd).replace(/</g, '\\u003c') : null;

  return (
    <Helmet>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {robots && <meta name="robots" content={robots} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {openGraphEntries.map(([key, value]) => (
        <meta key={`og:${key}`} property={`og:${key}`} content={value} />
      ))}

      {twitterEntries.map(([key, value]) => (
        <meta key={`twitter:${key}`} name={`twitter:${key}`} content={value} />
      ))}

      {jsonLdContent && (
        <script
          type="application/ld+json"
          id={schemaId}
          key={schemaId ?? 'json-ld'}
        >
          {jsonLdContent}
        </script>
      )}
    </Helmet>
  );
};

export default Seo;
