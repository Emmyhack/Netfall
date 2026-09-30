import { notFound } from 'next/navigation';

/**
 * Development harnesses. The folder is named %5Fdev so the URL segment is
 * literally /_dev; an unescaped underscore would make it a private folder and
 * no route at all.
 */
export const metadata = { robots: { index: false, follow: false } };

/*
 * Rendered per request, so no harness HTML is baked into the production
 * output. The real production 404 comes from the rewrite in next.config.mjs
 * — see the note there; this guard is the second line of defence and cannot
 * set the status itself once streaming has begun.
 */
export const dynamic = 'force-dynamic';

export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <div className="mx-auto max-w-page px-5 py-12 sm:px-6">
      <p className="mb-8 inline-block rounded-pill border border-caution bg-caution-soft px-4 py-2 text-xs font-medium text-caution">
        Development harness — not part of the production build.
      </p>
      {children}
    </div>
  );
}
