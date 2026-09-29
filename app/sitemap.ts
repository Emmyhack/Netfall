import type { MetadataRoute } from 'next';
import { CORRIDORS } from '@/lib/corridors';
import { SITE_URL } from '@/lib/site';

/**
 * Corridor pages are the search acquisition asset, so they carry the highest
 * priority and the most frequent change note. The marketing pages move rarely.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const corridors: MetadataRoute.Sitemap = CORRIDORS.map((corridor) => ({
    url: `${SITE_URL}/compare/${corridor.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, priority: 1 },
    { url: `${SITE_URL}/compare`, priority: 0.8 },
    { url: `${SITE_URL}/large-amounts`, priority: 0.7 },
    { url: `${SITE_URL}/alerts`, priority: 0.6 },
    { url: `${SITE_URL}/api`, priority: 0.6 },
    { url: `${SITE_URL}/how-we-make-money`, priority: 0.5 },
    { url: `${SITE_URL}/about`, priority: 0.5 },
  ].map((entry) => ({ ...entry, lastModified: now, changeFrequency: 'weekly' as const }));

  return [...pages, ...corridors];
}
