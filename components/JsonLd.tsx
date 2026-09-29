import { CORRIDORS } from '@/lib/corridors';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/site';

/**
 * Structured data.
 *
 * Deliberately no Offer or Product markup carrying prices. The figures on
 * these pages come from the mock layer, and even once they are live they
 * expire in ninety seconds — publishing them as durable structured prices
 * would put numbers in search results that we cannot stand behind. Rule §4.2
 * applies to machines reading the page as much as to people.
 */
function Script({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Serialised with JSON.stringify, so the content is data, never markup.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        slogan: 'See what actually lands',
      }}
    />
  );
}

export function WebSiteJsonLd() {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        publisher: { '@id': `${SITE_URL}/#organization` },
      }}
    />
  );
}

export function BreadcrumbJsonLd({ trail }: { trail: readonly { name: string; path: string }[] }) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((step, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: step.name,
          item: absoluteUrl(step.path),
        })),
      }}
    />
  );
}

/** Only ever fed the questions that are actually rendered on the page. */
export function FaqJsonLd({ questions }: { questions: readonly { q: string; a: string }[] }) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: questions.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      }}
    />
  );
}

export function CorridorListJsonLd() {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Stablecoin corridors tracked by Netfall',
        itemListElement: CORRIDORS.map((corridor, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: `${corridor.from} to ${corridor.to}`,
          url: absoluteUrl(`/compare/${corridor.slug}`),
        })),
      }}
    />
  );
}
