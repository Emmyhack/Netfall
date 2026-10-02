/**
 * One canonical origin. Metadata, the sitemap, robots and structured data all
 * read it, so a deployment change is a single edit.
 *
 * Resolution order: an explicit NEXT_PUBLIC_SITE_URL (set this once a custom
 * domain is attached), then the production domain Vercel exposes to every
 * build, then localhost. Previews deliberately canonicalise to production so
 * search engines credit the real site, and are kept out of the index below.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProduction) return `https://${vercelProduction}`;
  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl().replace(/\/$/, '');

/** True only on the production deployment (or a self-hosted production build). */
export const IS_INDEXABLE =
  process.env.VERCEL_ENV === undefined || process.env.VERCEL_ENV === 'production';

export const SITE_NAME = 'Netfall';

export const SITE_TAGLINE = 'See what actually lands';

export const SITE_DESCRIPTION =
  'Compare stablecoin conversion rates across providers by the one figure that matters: how much actually arrives. NGN, GHS and KES to USDT and USDC.';

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
