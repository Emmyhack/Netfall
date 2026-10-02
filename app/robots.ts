import type { MetadataRoute } from 'next';
import { IS_INDEXABLE, SITE_URL } from '@/lib/site';

/**
 * The development harnesses are excluded explicitly as well as returning 404
 * in production, so a crawler never spends budget discovering them.
 */
export default function robots(): MetadataRoute.Robots {
  // Preview deployments are reachable by URL but must never be indexed.
  if (!IS_INDEXABLE) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/_dev/', '/_next/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
