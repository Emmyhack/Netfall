import type { Metadata } from 'next';
import { AlertsCorridorBridge } from '@/components/AlertsCorridorBridge';
import { Pill } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';

export const metadata: Metadata = {
  title: 'Rate alerts',
  description:
    'Get told when a stablecoin corridor hits the rate you want, or when the cheapest provider changes.',
  alternates: { canonical: '/alerts' },
};

export default function AlertsPage() {
  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-page px-5 pb-16 pt-12 sm:px-6">
          <Pill className="mb-6">Stored on this device</Pill>
          <h1 className="text-display text-ink">Rate alerts</h1>
          <p className="mt-6 max-w-content text-lg text-ink-2">
            Rates move through the day, and the provider that was cheapest this morning often is
            not by the afternoon. Tell us what you are waiting for and we will watch the corridor.
          </p>
          <p className="mt-4 max-w-content text-ink-3">
            In this build alerts are stored in your browser and nothing is sent. No account, no
            mailing list, and your address does not leave the device.
          </p>
        </div>
      </section>

      <Section>
        <AlertsCorridorBridge />
      </Section>
    </>
  );
}
