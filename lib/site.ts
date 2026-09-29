/**
 * One canonical origin. Metadata, the sitemap, robots and structured data all
 * read it, so a deployment change is a single edit.
 *
 * LIVE: set NEXT_PUBLIC_SITE_URL per environment so preview deployments do
 * not advertise the production canonical.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://netfall.io').replace(
  /\/$/,
  '',
);

export const SITE_NAME = 'Netfall';

export const SITE_TAGLINE = 'See what actually lands';

export const SITE_DESCRIPTION =
  'Compare stablecoin conversion rates across providers by the one figure that matters: how much actually arrives. NGN, GHS and KES to USDT and USDC.';

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
