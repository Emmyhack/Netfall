import Link from 'next/link';
import { CORRIDORS } from '@/lib/corridors';
import { ButtonLink } from './ui/Button';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { href: '/compare/ngn-usdt', label: 'Compare' },
  { href: '/large-amounts', label: 'Large amounts' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/api', label: 'Developers' },
  { href: '/about', label: 'About' },
];

/**
 * Onramper's header: a full-width announcement strip in the brand dark, then
 * logo left, links centre, two pill actions right. The corridor strip below
 * is ours — on a comparison site the corridors are the navigation.
 */
export function SiteHeader() {
  return (
    <header>
      <div className="strip">
        <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <p className="text-sm">
            Netfall ranks providers by what actually lands. Nothing else moves the order.
          </p>
          <Link
            href="/how-we-make-money"
            className="hidden shrink-0 text-sm underline underline-offset-4 hover:opacity-80 sm:block"
          >
            How we make money
          </Link>
        </div>
      </div>

      <div className="border-b border-rule bg-paper">
        <div className="mx-auto flex max-w-page items-center gap-6 px-5 py-4 sm:px-6">
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight text-ink"
            style={{ fontStretch: '112%' }}
          >
            Netfall
          </Link>

          <nav aria-label="Primary" className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-pill px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <ThemeToggle />
            <ButtonLink href="/compare/ngn-usdt" variant="primary" size="sm" className="hidden sm:inline-flex">
              Compare rates
            </ButtonLink>
          </div>
        </div>
      </div>

      <nav
        aria-label="Primary, compact"
        className="border-b border-rule bg-paper lg:hidden"
      >
        <div className="mx-auto flex max-w-page gap-2 overflow-x-auto px-5 py-2 sm:px-6">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-pill border border-rule px-3 py-2 text-sm text-ink-2"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <nav aria-label="Corridor shortcuts" className="hidden border-b border-rule bg-paper lg:block">
        <div className="mx-auto flex max-w-page items-center gap-2 px-5 py-2 sm:px-6">
          <span className="mr-1 text-xs text-ink-3">Corridors</span>
          {CORRIDORS.map((corridor) => (
            <Link
              key={corridor.slug}
              href={`/compare/${corridor.slug}`}
              className="rounded-pill border border-rule px-3 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-rule-2 hover:text-ink"
            >
              {corridor.from} to {corridor.to}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
