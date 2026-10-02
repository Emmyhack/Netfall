import type { Metadata } from 'next';
import Link from 'next/link';
import { Section } from '@/components/ui/Section';
import { CONTACT_EMAIL, LEGAL_UPDATED } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'The terms for using Netfall’s rate comparison, alerts and API.',
  alternates: { canonical: '/terms' },
};

const TERMS: readonly [string, string][] = [
  [
    'Information, not advice',
    'Netfall shows prices that providers publish and ranks them by the amount that would arrive. Nothing here is financial, investment, tax or legal advice, or a recommendation to buy any asset or use any provider. Stablecoins carry risks, including the risk that a coin loses its peg.',
  ],
  [
    'Prices are indicative',
    'Figures come from providers’ public price feeds and change constantly. A figure marked estimated or not verified may differ from what a provider actually offers you. The provider’s own quote, at the moment you transact, is the only binding price.',
  ],
  [
    'We never handle your money',
    'Netfall does not hold funds, execute transactions, take custody of assets or act as an agent for any provider. Any transaction is between you and the provider you choose, on their terms. Check that a provider is permitted to serve you where you live before you use it.',
  ],
  [
    'Providers are independent',
    'We are not responsible for any provider’s service, availability, fees, conduct or solvency. Listing a provider is not an endorsement. We currently earn nothing from any provider; if that changes, it will be disclosed on the site.',
  ],
  [
    'Alerts and enquiries',
    'Alerts are a convenience and may be delayed or missed — for example if a provider stops answering. Do not rely on them for time-critical decisions. Replying to a large-amount enquiry is not a commitment to source a quote.',
  ],
  [
    'The public API',
    'The API is free for reasonable use within its published rate limits. Do not try to bypass the limits or overload the service. If you show our figures, show the confidence level and expiry with them. We may change or withdraw the API at any time.',
  ],
  [
    'No warranty, limited liability',
    'The service is provided as it is, without warranties of accuracy, availability or fitness for a purpose. To the extent the law allows, Netfall is not liable for losses arising from using or relying on the site, its figures, alerts or API.',
  ],
  [
    'Changes',
    'We may update these terms. The date at the top changes when we do, and continuing to use the site means accepting the current version.',
  ],
];

export default function TermsPage() {
  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-page px-5 pb-16 pt-12 sm:px-6">
          <h1 className="text-display max-w-[54rem] text-ink">Terms of use</h1>
          <p className="mt-6 max-w-content text-lg text-ink-2">
            Plain terms for a comparison service. Read with the{' '}
            <Link href="/privacy" className="text-ink underline underline-offset-4">
              privacy page
            </Link>
            .
          </p>
          <p className="mt-4 text-sm text-ink-3">Last updated {LEGAL_UPDATED}.</p>
        </div>
      </section>

      <Section tone="white" labelledBy="terms">
        <h2 id="terms" className="sr-only">
          Terms
        </h2>
        <dl className="grid max-w-content gap-10">
          {TERMS.map(([title, body]) => (
            <div key={title} className="border-t border-rule pt-5">
              <dt className="text-xl text-ink">{title}</dt>
              <dd className="mt-3 text-lg text-ink-2">{body}</dd>
            </div>
          ))}
        </dl>
        {CONTACT_EMAIL && (
          <p className="mt-12 max-w-content text-ink-2">
            Questions:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        )}
      </Section>
    </>
  );
}
