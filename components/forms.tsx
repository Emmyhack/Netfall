'use client';

import { useId } from 'react';
import { buttonClass } from './ui/Button';

/**
 * Shared form primitives. Written for this project rather than pulled from a
 * component library, so focus, error wiring and density match everything else.
 */

const FIELD_CLASS =
  'mt-2 w-full rounded-sm border border-rule-2 bg-paper px-4 py-3 text-base text-ink outline-none focus:border-ink';

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-2">
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && (
        <p id={hintId} className="mt-2 text-xs text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-2 text-xs text-caution">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean },
) {
  const { invalid, className, ...rest } = props;
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      className={[FIELD_CLASS, invalid ? 'border-caution' : '', className ?? ''].join(' ')}
    />
  );
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean },
) {
  const { invalid, className, children, ...rest } = props;
  return (
    <select
      {...rest}
      aria-invalid={invalid || undefined}
      className={[FIELD_CLASS, invalid ? 'border-caution' : '', className ?? ''].join(' ')}
    >
      {children}
    </select>
  );
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean },
) {
  const { invalid, className, ...rest } = props;
  return (
    <textarea
      {...rest}
      aria-invalid={invalid || undefined}
      className={[FIELD_CLASS, 'min-h-24 resize-y', invalid ? 'border-caution' : '', className ?? ''].join(
        ' ',
      )}
    />
  );
}

export function SubmitButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      type="submit"
      className={buttonClass('primary', 'lg')}
    >
      {children}
    </button>
  );
}
