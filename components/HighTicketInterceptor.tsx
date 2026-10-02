'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/format';
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

/** Inlined at build from the server configuration (next.config.mjs). */
const ENQUIRIES_READY = process.env.NEXT_PUBLIC_ENQUIRIES_READY === '1';

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
 * happens next, and exactly who receives the enquiry: a person at Netfall,
 * by email (lib/server/enquiries.ts).
 */
export function HighTicketInterceptor({ corridor, amount, className }: HighTicketInterceptorProps) {
  const [frequency, setFrequency] = useState<Frequency>('one_off');
  const [settlementWindow, setSettlementWindow] = useState<Window>('next_day');
  const [entityType, setEntityType] = useState<Entity>('business');
  const [channel, setChannel] = useState<AlertChannel>('email');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState<{ reference: string; frequency: Frequency; window: Window } | null>(null);

  if (submitted) {
    return (
      <section
        className={['rounded-card border border-best bg-best-soft p-8', className ?? ''].join(' ')}
        aria-live="polite"
      >
        <h2 className="text-3xl text-ink">Enquiry sent</h2>
        <p className="mt-2 max-w-content text-base text-ink-2">
          We have your request to move {formatMoney(amount, corridor.from, { decimals: 0 })} into{' '}
          {corridor.to}, {frequencyLabel(submitted.frequency)}, settling{' '}
          {windowLabel(submitted.window).toLowerCase()}.
        </p>
        <p className="mt-3 max-w-content text-sm text-ink-2">
          A person at Netfall reads every enquiry and will reply{' '}
          {channel === 'email' ? 'by email' : 'on WhatsApp'}. Your reference is{' '}
          <span className="numeric text-ink">{submitted.reference}</span>.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(null)}
          className={buttonClass('secondary', 'md', 'mt-6')}
        >
          Send another
        </button>
      </section>
    );
  }

  const submit = async (event: React.FormEvent) => {
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
    setError(null);
    setSendError(null);
    setSending(true);

    try {
      const response = await fetch('/api/v1/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corridor: corridor.slug,
          amount,
          frequency,
          settlementWindow,
          entityType,
          contactChannel: channel,
          contactDestination: trimmed,
          notes: notes.trim(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
      if (response.ok && payload?.id) {
        setSubmitted({ reference: payload.id, frequency, window: settlementWindow });
      } else {
        setSendError(payload?.message ?? 'That did not go through. Try again.');
      }
    } catch {
      setSendError('You appear to be offline. Try again when you are connected.');
    } finally {
      setSending(false);
    }
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
          At this size the price is negotiated. Tell us the shape of the trade and a person at
          Netfall will reply about sourcing quotes for it. We never touch the money: if a desk can
          quote this size, you deal with them directly.
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
          hint="Sent to the Netfall team with this enquiry, and used only to reply to it."
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

        <div className="space-y-3 sm:col-span-2">
          {!ENQUIRIES_READY && (
            <p className="rounded-card border border-caution bg-caution-soft px-5 py-4 text-sm text-caution">
              Large-amount enquiries are not open yet, so this form cannot be sent.
            </p>
          )}
          <SubmitButton disabled={!ENQUIRIES_READY || sending}>
            {sending ? 'Sending…' : 'Send the enquiry'}
          </SubmitButton>
          <p aria-live="polite" className="text-sm text-caution">
            {sendError ?? ''}
          </p>
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
