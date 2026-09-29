'use client';

import { useEffect, useState } from 'react';
import { Close } from './icons';
import { CORRIDORS, getCorridor } from '@/lib/corridors';
import { formatAmountInput, formatDate, formatMoney, parseAmountInput } from '@/lib/format';
import { deleteAlert, listAlerts, newId, saveAlert } from '@/lib/storage';
import type { AlertChannel, CorridorMeta, RateAlert } from '@/lib/types';
import { AmountField } from './AmountField';
import { Field, Select, SubmitButton, TextInput } from './forms';

type TriggerKind = 'target_rate' | 'best_provider_changes';

/**
 * V1 keeps alerts on the device. There is no sender, no queue and no account,
 * and the form says so rather than implying a message is on its way.
 *
 * LIVE: POST /v1/alerts with a verified contact, then the alert evaluator
 * polls the corridor and dispatches over email or WhatsApp.
 */
export function RateAlertForm({ defaultCorridor }: { defaultCorridor?: string }) {
  const initial = getCorridor(defaultCorridor ?? null) ?? (CORRIDORS[0] as CorridorMeta);

  const [corridorSlug, setCorridorSlug] = useState(initial.slug);
  const [trigger, setTrigger] = useState<TriggerKind>('target_rate');
  const [rateInput, setRateInput] = useState('');
  const [channel, setChannel] = useState<AlertChannel>('email');
  const [destination, setDestination] = useState('');
  const [errors, setErrors] = useState<{ rate?: string; destination?: string }>({});
  const [saved, setSaved] = useState<RateAlert[]>([]);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => setSaved(listAlerts()), []);

  const corridor = getCorridor(corridorSlug) ?? initial;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};

    const rate = parseAmountInput(rateInput);
    if (trigger === 'target_rate' && (rate === null || rate === '0')) {
      next.rate = `Enter the rate you want, in ${corridor.from} per ${corridor.to}.`;
    }

    const contact = destination.trim();
    if (contact === '') {
      next.destination = channel === 'email' ? 'Enter an email address.' : 'Enter a WhatsApp number.';
    } else if (channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      next.destination = 'That email address is not complete.';
    } else if (channel === 'whatsapp' && !/^\+?[\d\s-]{7,}$/.test(contact)) {
      next.destination = 'Include the country code, for example +234 802 000 0000.';
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const alert: RateAlert = {
      id: newId('alert'),
      corridor: corridor.slug,
      trigger:
        trigger === 'target_rate' && rate
          ? { kind: 'target_rate', targetRate: rate }
          : { kind: 'best_provider_changes' },
      channel,
      destination: contact,
      createdAt: new Date().toISOString(),
    };

    saveAlert(alert);
    setSaved(listAlerts());
    setConfirmation(
      `Alert saved for ${corridor.from} to ${corridor.to}. It lives in this browser only — nothing was sent.`,
    );
    setRateInput('');
  };

  const remove = (id: string) => {
    deleteAlert(id);
    setSaved(listAlerts());
    setConfirmation('Alert removed.');
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Corridor">
          {({ id }) => (
            <Select
              id={id}
              value={corridorSlug}
              onChange={(event) => setCorridorSlug(event.target.value)}
            >
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
                  We check the best available rate across every provider in the corridor.
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
                  Useful if you already have an account somewhere and want to know when it stops
                  being the best place to go.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        {trigger === 'target_rate' && (
          <Field
            label={`Target rate (${corridor.from} per ${corridor.to})`}
            hint={`We will tell you when 1 ${corridor.to} costs less than this.`}
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

        <Field label="Reach me by">
          {({ id }) => (
            <Select
              id={id}
              value={channel}
              onChange={(event) => setChannel(event.target.value as AlertChannel)}
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </Select>
          )}
        </Field>

        <Field
          label={channel === 'email' ? 'Email address' : 'WhatsApp number'}
          error={errors.destination ?? null}
          hint="Stored in this browser only. No account, no mailing list."
        >
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              type={channel === 'email' ? 'email' : 'tel'}
              value={destination}
              invalid={invalid}
              aria-describedby={describedBy}
              onChange={(event) => setDestination(event.target.value)}
              placeholder={channel === 'email' ? 'you@example.com' : '+234 802 000 0000'}
            />
          )}
        </Field>

        <SubmitButton>Save this alert</SubmitButton>

        <p aria-live="polite" className="text-sm text-ink-2">
          {confirmation}
        </p>
      </form>

      <section aria-labelledby="saved-alerts">
        <h2 id="saved-alerts" className="text-2xl text-ink">
          Alerts on this device
        </h2>
        {saved.length === 0 ? (
          <p className="mt-2 max-w-content text-sm text-ink-2">
            Nothing saved yet. Alerts you create appear here and stay in this browser.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface">
            {saved.map((alert) => (
              <AlertRow key={alert.id} alert={alert} onRemove={() => remove(alert.id)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AlertRow({ alert, onRemove }: { alert: RateAlert; onRemove: () => void }) {
  const corridor = getCorridor(alert.corridor);
  if (!corridor) return null;

  return (
    <li className="flex items-start justify-between gap-4 px-5 py-4">
      <div>
        <p className="text-base text-ink">
          {corridor.from} to {corridor.to}
        </p>
        <p className="mt-px text-sm text-ink-2">
          {alert.trigger.kind === 'target_rate'
            ? `When 1 ${corridor.to} costs less than ${formatMoney(alert.trigger.targetRate, corridor.from, { decimals: 2 })}`
            : 'When the cheapest provider changes'}
        </p>
        <p className="mt-px text-xs text-ink-3">
          {alert.channel === 'email' ? 'Email' : 'WhatsApp'} to {alert.destination}, saved{' '}
          {formatDate(alert.createdAt)}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-pill border border-rule p-2 text-xs text-ink-2 transition-colors hover:bg-surface-2"
      >
        <Close className="h-3 w-3" />
        <span className="sr-only">
          Remove the {corridor.from} to {corridor.to} alert
        </span>
      </button>
    </li>
  );
}
