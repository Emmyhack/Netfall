import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/ui/Button';

export const metadata: Metadata = { title: 'Rate alerts', robots: { index: false } };
export const dynamicParams = false;

const STATES: Record<string, { title: string; body: string }> = {
  confirmed: {
    title: 'Alert confirmed',
    body: 'We are watching the corridor now and will email you when it matters. Ongoing alerts can be stopped from any email they send.',
  },
  unsubscribed: {
    title: 'Unsubscribed',
    body: 'The alert is gone, and so is the email address it was sent to. You will not hear from it again.',
  },
  expired: {
    title: 'This alert has expired',
    body: 'Unconfirmed alerts are deleted after 48 hours. Set it up again and confirm from the new email.',
  },
  invalid: {
    title: 'That link did not work',
    body: 'It may have been copied incompletely, or it has expired. Open it again from the email, or set up a new alert.',
  },
  error: {
    title: 'Something went wrong',
    body: 'We could not complete that just now. Try the link again in a minute.',
  },
};

export function generateStaticParams() {
  return Object.keys(STATES).map((state) => ({ state }));
}

export default async function ResultPage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const content = STATES[state];
  if (!content) notFound();
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-page px-5 pb-24 pt-12 sm:px-6">
        <h1 className="text-display max-w-[54rem] text-ink">{content.title}</h1>
        <p className="mt-6 max-w-content text-lg text-ink-2">{content.body}</p>
        <ButtonLink href="/alerts" variant="secondary" size="lg" className="mt-10">
          Rate alerts
        </ButtonLink>
      </div>
    </section>
  );
}
