import Link from 'next/link';
import { CORRIDORS } from '@/lib/corridors';

/**
 * Onramper's footer sits on the page colour, not a dark band, and runs five
 * columns: the mark, then four link groups.
 */
export function SiteFooter() {
  return (
    <footer className="sec-paper border-t border-rule">
      <div className="mx-auto max-w-page px-5 py-20 sm:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <p className="text-2xl text-ink">Netfall</p>
            <p className="mt-4 max-w-content text-sm text-ink-2">
              The rate truth layer for stablecoin corridors.
            </p>
          </div>

          <FooterNav
            label="Corridors"
            links={CORRIDORS.map((c) => ({
              href: `/compare/${c.slug}`,
              label: `${c.from} to ${c.to}`,
            }))}
          />
          <FooterNav
            label="Product"
            links={[
              { href: '/compare/ngn-usdt', label: 'Compare rates' },
              { href: '/alerts', label: 'Rate alerts' },
              { href: '/large-amounts', label: 'Large amounts' },
            ]}
          />
          <FooterNav
            label="Developers"
            links={[
              { href: '/api', label: 'Public API' },
              { href: '/status', label: 'Provider status' },
            ]}
          />
          <FooterNav
            label="Company"
            links={[
              { href: '/about', label: 'What we measure' },
              { href: '/how-we-make-money', label: 'How we make money' },
            ]}
          />
        </div>

        <p className="mt-20 max-w-content border-t border-rule pt-8 text-sm text-ink-3">
          Netfall never holds funds, never executes transactions and never takes custody. We
          measure what providers offer and hand you off to them. Rates change constantly; a
          figure is valid only for as long as its countdown shows.
        </p>
      </div>
    </footer>
  );
}

function FooterNav({
  label,
  links,
}: {
  label: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <nav aria-label={label}>
      <h2 className="text-sm font-medium text-ink">{label}</h2>
      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={`${label}-${link.href}-${link.label}`}>
            <Link href={link.href} className="text-sm text-ink-2 hover:text-ink hover:underline hover:underline-offset-4">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
