'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/format';
import { newId, saveEnquiry } from '@/lib/storage';
import type { AlertChannel, CorridorMeta, LargeAmountEnquiry } from '@/lib/types';
import { Field, Select, SubmitButton, TextArea, TextInput } from './forms';
import { buttonClass } from './ui/Button';

export interface HighTicketInterceptorProps {
  corridor: CorridorMeta;
  amount: string;
  className?: string;
}

type Frequency = LargeAmountEnquiry['frequency'];
type Window = LargeAmountEnquiry['settlementWindow'];
type Entity = LargeAmountEnquiry['entityType'];

const FREQUENCIES: readonly { value: Frequency; label: string }[] = [
  { value: 'one_off', label: 'Once' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'ongoing', label: 'Continuously' },
];

const WINDOWS: readonly { value: Window; label: string }[] = [
  { value: 'same_day', label: 'Same day' },
  { value: 'next_day', label: 'Next working day' },
  { value: 'flexible', label: 'Whenever the price is right' },
];

/**
 * Above a corridor's threshold the rate board stops being the right answer.
 * Public rates are quoted against retail liquidity; at this size the price is
 * negotiated and the board figure is misleading.
 *
 * This is a revenue-critical surface, not a courtesy message, and it gets the
 * same care as the table: it says plainly why the comparison stopped, what
 * happens next, and exactly what leaves the device.
 */
export function HighTicketInterceptor({ corridor, amount, className }: HighTicketInterceptorProps) {
  const [frequency, setFrequency] = useState<Frequency>('one_off');
  const [settlementWindow, setSettlementWindow] = useState<Window>('next_day');
  const [entityType, setEntityType] = useState<Entity>('business');
  const [channel, setChannel] = useState<AlertChannel>('email');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<LargeAmountEnquiry | null>(null);

  if (submitted) {
    return (
      <section
        className={['rounded-card border border-best bg-best-soft p-8', className ?? ''].join(' ')}
        aria-live="polite"
      >
        <h2 className="text-3xl text-ink">Enquiry recorded</h2>
        <p className="mt-2 max-w-content text-base text-ink-2">
          We have your request to move {formatMoney(submitted.amount, corridor.from, { decimals: 0 })}{' '}
          into {corridor.to}, {frequencyLabel(submitted.frequency)}, settling{' '}
          {windowLabel(submitted.settlementWindow).toLowerCase()}.
        </p>
        <p className="mt-3 max-w-content text-sm text-ink-2">
          In this build nothing is sent anywhere. The enquiry is stored in this browser only, so
          you can see exactly what would be transmitted. No desk has been contacted and no quote
          has been requested.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(null)}
          className={buttonClass('secondary', 'md', 'mt-6')}
        >
          Edit the enquiry
        </button>
      </section>
    );
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmed = destination.trim();
    if (trimmed === '') {
      setError(channel === 'email' ? 'Enter an email address.' : 'Enter a WhatsApp number.');
      return;
    }
    if (channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('That email address is not complete.');
      return;
    }
    if (channel === 'whatsapp' && !/^\+?[\d\s-]{7,}$/.test(trimmed)) {
      setError('Enter a number with its country code, for example +234 802 000 0000.');
      return;
    }

    const enquiry: LargeAmountEnquiry = {
      id: newId('enq'),
      corridor: corridor.slug,
      amount,
      frequency,
      settlementWindow,
      entityType,
      contactChannel: channel,
      contactDestination: trimmed,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    // LIVE: POST /v1/enquiries, then route to the OTC desk queue.
    saveEnquiry(enquiry);
    setError(null);
    setSubmitted(enquiry);
  };

  return (
    <section className={['overflow-hidden rounded-card border border-rule-2 bg-surface', className ?? ''].join(' ')}>
      <div className="border-b border-rule px-6 py-5">
        <h2 className="text-3xl text-ink">
          {formatMoney(amount, corridor.from, { decimals: 0 })} is too large for the rate board
        </h2>
        <p className="mt-2 max-w-content text-base text-ink-2">
          Public rates are quoted against retail liquidity. Above{' '}
          {formatMoney(corridor.otcThreshold, corridor.from, { decimals: 0 })} in this corridor, a
          single order moves the price against you, and the figures on the board stop describing
          what you would actually receive. Showing them would be dishonest.
        </p>
        <p className="mt-2 max-w-content text-base text-ink-2">
          At this size the price is negotiated. Tell us the shape of the trade and we will put it
          to desks that quote it, then send you what they come back with. We still do not touch
          the money and we still rank on what lands.
        </p>
        <p className="mt-2 max-w-content text-sm text-ink-3">
          On {formatMoney(amount, corridor.from, { decimals: 0 })}, the gap between venues is
          worth more than most people expect.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-4 px-6 py-5 sm:grid-cols-2">
        <Field label="Amount" hint="Taken from the comparison above.">
          {({ id }) => (
            <TextInput
              id={id}
              readOnly
              value={formatMoney(amount, corridor.from, { decimals: 0 })}
              className="numeric"
            />
          )}
        </Field>

        <Field label="How often" hint="Repeat flow gets better pricing than a single order.">
          {({ id }) => (
            <Select
              id={id}
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as Frequency)}
            >
              {FREQUENCIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="When it needs to settle">
          {({ id }) => (
            <Select
              id={id}
              value={settlementWindow}
              onChange={(event) => setSettlementWindow(event.target.value as Window)}
            >
              {WINDOWS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Sending as" hint="Desks price individuals and businesses differently.">
          {({ id }) => (
            <Select
              id={id}
              value={entityType}
              onChange={(event) => setEntityType(event.target.value as Entity)}
            >
              <option value="business">A business</option>
              <option value="individual">An individual</option>
            </Select>
          )}
        </Field>

        <Field label="Reach you by">
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
          error={error}
          hint="Stored in this browser only. Nothing is sent in this build."
        >
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              type={channel === 'email' ? 'email' : 'tel'}
              value={destination}
              invalid={invalid}
              aria-describedby={describedBy}
              onChange={(event) => setDestination(event.target.value)}
              placeholder={channel === 'email' ? 'you@company.com' : '+234 802 000 0000'}
            />
          )}
        </Field>

        <div className="sm:col-span-2">
          <Field label="Anything else the desk should know" hint="Optional.">
            {({ id }) => (
              <TextArea
                id={id}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Source of funds, preferred settlement rail, deadline."
              />
            )}
          </Field>
        </div>

        <div className="sm:col-span-2">
          <SubmitButton>Send the enquiry</SubmitButton>
        </div>
      </form>
    </section>
  );
}

function frequencyLabel(value: Frequency): string {
  return FREQUENCIES.find((f) => f.value === value)?.label.toLowerCase() ?? 'once';
}

function windowLabel(value: Window): string {
  return WINDOWS.find((w) => w.value === value)?.label ?? 'Next working day';
}
