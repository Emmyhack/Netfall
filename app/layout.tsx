import type { Metadata, Viewport } from 'next';
import { fontVariables } from './fonts';
import { themeBootstrapScript } from '@/lib/theme';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://netfall.io'),
  title: {
    default: 'Netfall — see what actually lands',
    template: '%s · Netfall',
  },
  description:
    'Compare stablecoin conversion rates across providers by the one figure that matters: how much actually arrives. NGN, GHS and KES to USDT and USDC.',
  applicationName: 'Netfall',
  openGraph: {
    type: 'website',
    siteName: 'Netfall',
    title: 'Netfall — see what actually lands',
    description:
      'Providers advertise numbers you cannot compare. Netfall resolves them to the final arriving amount.',
  },
  robots: { index: true, follow: true },
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
