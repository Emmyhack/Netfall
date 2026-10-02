import type { Metadata, Viewport } from 'next';
import { fontVariables } from './fonts';
import { themeBootstrapScript } from '@/lib/theme';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE.toLowerCase()}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE.toLowerCase()}`,
    description:
      'Providers advertise numbers you cannot compare. Netfall resolves them to the final arriving amount.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE.toLowerCase()}`,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EFEEF3' },
    { media: '(prefers-color-scheme: dark)', color: '#04201D' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies a stored theme before first paint so neither theme flashes. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        {/* Vercel Web Analytics: cookieless page-view counts, same-origin, and
            no bytes in the app bundle. On only when NEXT_PUBLIC_VERCEL_ANALYTICS=1
            and Web Analytics is enabled for the project. */}
        {process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === '1' && (
          <script defer src="/_vercel/insights/script.js" />
        )}
      </head>
      <body className={fontVariables}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:border focus:border-rule-2 focus:bg-surface focus:px-5 focus:py-3 focus:text-sm"
        >
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
