import type { Metadata } from 'next';
import { TokenAction } from '@/components/TokenAction';

export const metadata: Metadata = { title: 'Confirm your alert', robots: { index: false } };

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <TokenAction
      title="Confirm your rate alert"
      body="One click and we start watching the corridor for you. Target-rate alerts delete themselves once they fire; ongoing ones can be stopped from any email they send."
      action="/api/v1/alerts/confirm"
      button="Confirm the alert"
      token={token}
    />
  );
}
