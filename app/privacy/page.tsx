import type { Metadata } from 'next';
import { Section } from '@/components/ui/Section';
import { CONTACT_EMAIL, LEGAL_UPDATED } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What Netfall collects, why, who processes it, and how long it is kept.',
  alternates: { canonical: '/privacy' },
};

/*
 * Every statement on this page describes what the code actually does. When
 * the code changes what it stores or for how long, this page changes in the
 * same commit.
 */
const ROWS: readonly [string, string, string][] = [
  [
    'Comparing rates',
    'Nothing that identifies you. The corridor and amount you enter are sent to our servers to fetch prices and are not stored.',
    'Not kept',
  ],
  [
    'Rate alerts',
    'Your email address, the corridor and the rate or condition you chose.',
    'Until the alert fires, you unsubscribe, or 48 hours if you never confirm it',
  ],
  [
    'Large-amount enquiries',
    'Your email address or WhatsApp number, the amount, timing and anything you write in the notes.',
    '180 days, then deleted automatically',
  ],
  [
    'Abuse protection',
    'Your IP address, counted against a per-minute or per-hour limit.',
    'Until the counting window ends, at most one hour',
  ],
  [
    'Server logs',
    'Requests and errors, including IP address, as recorded by our host.',
    'As set by our host’s log retention',
  ],
  [
    'When a page fails',
    'The page address and an error reference, so we can find and fix the fault. Nothing about you.',
    'As set by our host’s log retention',
  ],
  [
    'Display preference',
    'Light or dark mode, if you choose one, stored in your own browser. It never reaches us.',
    'Until you clear it',
  ],
];

export default function PrivacyPage() {
  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-page px-5 pb-16 pt-12 sm:px-6">
          <h1 className="text-display max-w-[54rem] text-ink">Privacy</h1>
          <p className="mt-6 max-w-content text-lg text-ink-2">
            Netfall compares prices. It does not need an account, does not hold funds and does not
            use advertising or tracking cookies. This page lists everything we do collect.
          </p>
          <p className="mt-4 text-sm text-ink-3">Last updated {LEGAL_UPDATED}.</p>
        </div>
      </section>

      <Section tone="white" labelledBy="what">
        <h2 id="what" className="text-3xl text-ink">
          What we collect, and for how long
        </h2>
        <div className="mt-10 overflow-x-auto rounded-card border border-rule">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-surface-2 text-ink-3">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">When</th>
                <th scope="col" className="px-5 py-3 font-medium">What</th>
                <th scope="col" className="px-5 py-3 font-medium">Kept for</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([when, what, kept]) => (
                <tr key={when} className="border-t border-rule align-top">
                  <th scope="row" className="px-5 py-4 font-medium text-ink">{when}</th>
                  <td className="px-5 py-4 text-ink-2">{what}</td>
                  <td className="px-5 py-4 text-ink-2">{kept}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section tone="paper" labelledBy="who">
        <h2 id="who" className="text-3xl text-ink">
          Who processes it
        </h2>
        <ul className="mt-8 max-w-content space-y-4 text-lg text-ink-2">
          <li>
            <strong className="text-ink">Vercel</strong> hosts the site and runs our servers. If
            usage analytics are enabled, they are Vercel Web Analytics, which counts page views
            without cookies.
          </li>
          <li>
            <strong className="text-ink">Upstash</strong> stores alerts, enquiries and rate-limit
            counters.
          </li>
          <li>
            <strong className="text-ink">Resend</strong> delivers alert and enquiry emails.
          </li>
        </ul>
        <p className="mt-8 max-w-content text-lg text-ink-2">
          We do not sell or share your information with anyone else, including the providers we
          compare. When you follow a link to a provider, what you do there is governed by their
          privacy policy, not ours.
        </p>
      </Section>

      <Section tone="white" labelledBy="rights">
        <h2 id="rights" className="text-3xl text-ink">
          Your choices
        </h2>
        <p className="mt-6 max-w-content text-lg text-ink-2">
          Every ongoing alert email has an unsubscribe link that deletes the alert and your address
          at once. For anything else — a copy of what we hold about you, a correction, or deleting
          an enquiry —{' '}
          {CONTACT_EMAIL ? (
            <>
              write to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>
            </>
          ) : (
            'reply to any email we have sent you'
          )}
          . We answer within 30 days.
        </p>
      </Section>
    </>
  );
}
