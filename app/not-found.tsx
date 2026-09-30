import { CorridorUnsupported } from '@/components/states/CorridorUnsupported';
import { ButtonLink } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { CORRIDORS } from '@/lib/corridors';
import type { CorridorMeta } from '@/lib/types';

export const metadata = { title: 'Page not found' };

/**
 * The only 404 in the app.
 *
 * A segment-scoped not-found under /compare would never run: dynamicParams is
 * false on the corridor route, so Next rejects an unknown corridor at the
 * routing layer before entering the segment. One page handles both cases, and
 * it is built from the CorridorUnsupported state so §9's empty state is the
 * thing users actually reach.
 */
export default function NotFound() {
  return (
    <Section tone="paper" size="lg">
      <h1 className="text-display text-ink">That page does not exist</h1>
      <p className="mt-8 max-w-content text-lead text-ink-3">
        The link may be out of date, or the corridor may not be one Netfall tracks yet.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/compare/ngn-usdt" variant="primary" size="lg">
          Compare NGN to USDT
        </ButtonLink>
        <ButtonLink href="/" variant="secondary" size="lg">
          Back to the homepage
        </ButtonLink>
      </div>

      <CorridorUnsupported className="mt-20" nearest={CORRIDORS[0] as CorridorMeta} />
    </Section>
  );
}
