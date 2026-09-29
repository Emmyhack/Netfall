import { notFound } from 'next/navigation';

/**
 * Development harnesses. The folder is named %5Fdev so the URL segment is
 * literally /_dev; an unescaped underscore would make it a private folder and
 * no route at all.
 */
export const metadata = { robots: { index: false, follow: false } };

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
