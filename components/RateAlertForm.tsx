'use client';

import { useState } from 'react';
import { CORRIDORS, getCorridor } from '@/lib/corridors';
import { formatMoney, parseAmountInput } from '@/lib/format';
import type { CorridorMeta } from '@/lib/types';
import { AmountField } from './AmountField';
import { Field, Select, SubmitButton, TextInput } from './forms';

type TriggerKind = 'target_rate' | 'best_provider_changes';
type Phase = { kind: 'editing' } | { kind: 'sending' } | { kind: 'sent'; email: string } | { kind: 'failed'; message: string };

/** Inlined at build from the server configuration (next.config.mjs). */
const ALERTS_READY = process.env.NEXT_PUBLIC_ALERTS_READY === '1';

/**
 * Alerts are email only, double opt-in: submitting sends a confirmation
 * email, and nothing is watched until the recipient clicks it. WhatsApp is
 * not offered because sending to it needs a Meta Business account and
 * approved templates that this deployment does not have.
 */
export function RateAlertForm({ defaultCorridor }: { defaultCorridor?: string }) {
  const initial = getCorridor(defaultCorridor ?? null) ?? (CORRIDORS[0] as CorridorMeta);

  const [corridorSlug, setCorridorSlug] = useState(initial.slug);
  const [trigger, setTrigger] = useState<TriggerKind>('target_rate');
  const [rateInput, setRateInput] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ rate?: string; email?: string }>({});
  const [phase, setPhase] = useState<Phase>({ kind: 'editing' });

  const corridor = getCorridor(corridorSlug) ?? initial;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};

    const rate = parseAmountInput(rateInput);
    if (trigger === 'target_rate' && (rate === null || rate === '0')) {
      next.rate = `Enter the rate you want, in ${corridor.from} per ${corridor.to}.`;
    }
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      next.email = address === '' ? 'Enter an email address.' : 'That email address is not complete.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPhase({ kind: 'sending' });
    try {
      const response = await fetch('/api/v1/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corridor: corridor.slug,
          email: address,
          trigger:
            trigger === 'target_rate'
              ? { kind: 'target_rate', targetRate: rate }
              : { kind: 'best_provider_changes' },
        }),
      });
      if (response.ok) {
        setPhase({ kind: 'sent', email: address });
        return;
      }
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setPhase({ kind: 'failed', message: payload?.message ?? 'That did not go through. Try again.' });
    } catch {
      setPhase({ kind: 'failed', message: 'You appear to be offline. Try again when you are connected.' });
    }
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {phase.kind === 'sent' ? (
        <div aria-live="polite" className="rounded-card border border-best bg-best-soft p-8">
          <h2 className="text-3xl text-ink">Check your inbox</h2>
          <p className="mt-3 max-w-content text-ink-2">
            We sent a confirmation link to <strong className="text-ink">{phase.email}</strong>.
            Nothing is watched until you click it, and the link expires in 48 hours.
          </p>
          <button
            type="button"
            onClick={() => {
              setPhase({ kind: 'editing' });
              setRateInput('');
            }}
            className="mt-6 text-sm font-medium text-ink underline underline-offset-4"
          >
            Set up another alert
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {!ALERTS_READY && (
            <p className="rounded-card border border-caution bg-caution-soft px-5 py-4 text-sm text-caution">
              Rate alerts are not switched on yet. The form below shows what you will be able to
              set; submitting it will not work until they are.
            </p>
          )}

          <Field label="Corridor">
            {({ id }) => (
              <Select id={id} value={corridorSlug} onChange={(event) => setCorridorSlug(event.target.value)}>
                {CORRIDORS.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.from} to {c.to}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <fieldset>
            <legend className="text-sm text-ink-2">Tell me when</legend>
            <div className="mt-1 space-y-2">
              <label className="flex items-start gap-3 rounded-sm border border-rule-2 bg-paper p-4">
                <input
                  type="radio"
                  name="trigger"
                  value="target_rate"
                  checked={trigger === 'target_rate'}
                  onChange={() => setTrigger('target_rate')}
                  className="mt-1"
                />
                <span>
                  <span className="block text-base text-ink">The rate hits a number I pick</span>
                  <span className="block text-sm text-ink-2">
                    One email when it happens, then the alert deletes itself.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-sm border border-rule-2 bg-paper p-4">
                <input
                  type="radio"
                  name="trigger"
                  value="best_provider_changes"
                  checked={trigger === 'best_provider_changes'}
                  onChange={() => setTrigger('best_provider_changes')}
                  className="mt-1"
                />
                <span>
                  <span className="block text-base text-ink">The cheapest provider changes</span>
                  <span className="block text-sm text-ink-2">
                    At most one email every six hours, until you unsubscribe.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          {trigger === 'target_rate' && (
            <Field
              label={`Target rate (${corridor.from} per ${corridor.to})`}
              hint={`We email you when the best price for 1 ${corridor.to} is at or below this, measured on a ${formatMoney(corridor.defaultAmount, corridor.from, { decimals: 0 })} transfer.`}
              error={errors.rate ?? null}
            >
              {({ id, describedBy, invalid }) => (
                <AmountField
                  id={id}
                  value={rateInput}
                  aria-invalid={invalid || undefined}
                  aria-describedby={describedBy}
                  onValueChange={setRateInput}
                  placeholder="1,570"
                  className={[
                    'numeric mt-1 w-full rounded border bg-paper px-3 py-2 text-base text-ink outline-none focus:border-rule-2',
                    invalid ? 'border-caution' : 'border-rule',
                  ].join(' ')}
                />
              )}
            </Field>
          )}

          <Field
            label="Email address"
            error={errors.email ?? null}
            hint="Used for this alert only, and deleted with it. No account, no mailing list."
          >
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                type="email"
                autoComplete="email"
                value={email}
                invalid={invalid}
                aria-describedby={describedBy}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            )}
          </Field>

          <SubmitButton disabled={!ALERTS_READY || phase.kind === 'sending'}>
            {phase.kind === 'sending' ? 'Sending…' : 'Create alert'}
          </SubmitButton>

          <p aria-live="polite" className="text-sm text-caution">
            {phase.kind === 'failed' ? phase.message : ''}
          </p>
        </form>
      )}

      <section aria-labelledby="how-alerts-work">
        <h2 id="how-alerts-work" className="text-2xl text-ink">
          How alerts work
        </h2>
        <ul className="mt-4 space-y-4 text-ink-2">
          <li className="border-t border-rule pt-4">
            We check every corridor every 15 minutes using the same live comparison as the site.
          </li>
          <li className="border-t border-rule pt-4">
            Only prices we can stand behind count. A quote we could not confirm is never used to
            trigger an alert.
          </li>
          <li className="border-t border-rule pt-4">
            Ongoing alerts carry an unsubscribe link in every email; unsubscribing deletes the
            alert and your address together.
          </li>
          <li className="border-t border-rule pt-4">
            An alert is a nudge, not a quote. Rates move, so check the live comparison before you
            send money.
          </li>
        </ul>
      </section>
    </div>
  );
}
