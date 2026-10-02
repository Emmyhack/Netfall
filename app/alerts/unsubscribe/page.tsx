import type { Metadata } from 'next';
import { TokenAction } from '@/components/TokenAction';

export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <TokenAction
      title="Stop this alert"
      body="The alert is deleted, along with the email address it was sent to."
      action="/api/v1/alerts/unsubscribe"
      button="Unsubscribe"
      token={token}
    />
  );
}
