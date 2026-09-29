'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { formatAmountInput } from '@/lib/format';

/**
 * A text input that groups digits as they are typed.
 *
 * Reformatting on every keystroke moves the caret to the end, which makes it
 * impossible to correct a digit in the middle of a large number — exactly the
 * thing someone entering ₦12,500,000 needs to do. So the caret is recorded as
 * a count of significant characters before it, and restored to the same
 * logical place after the separators have been redrawn.
 */
export interface AmountFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string;
  onValueChange: (formatted: string) => void;
}

const isSignificant = (character: string): boolean => /[\d.]/.test(character);

function countSignificant(value: string, upTo: number): number {
  let count = 0;
  for (let i = 0; i < upTo && i < value.length; i += 1) {
    if (isSignificant(value[i] as string)) count += 1;
  }
  return count;
}

function positionAfterSignificant(value: string, target: number): number {
  if (target === 0) return 0;
  let count = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (isSignificant(value[i] as string)) {
      count += 1;
      if (count === target) return i + 1;
    }
  }
  return value.length;
}

export function AmountField({ value, onValueChange, className, ...rest }: AmountFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [pendingCaret, setPendingCaret] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (pendingCaret === null) return;
    const node = ref.current;
    if (node) {
      const position = positionAfterSignificant(node.value, pendingCaret);
      node.setSelectionRange(position, position);
    }
    setPendingCaret(null);
  }, [pendingCaret, value]);

  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(event) => {
        const raw = event.target.value;
        const caret = event.target.selectionStart ?? raw.length;
        setPendingCaret(countSignificant(raw, caret));
        onValueChange(formatAmountInput(raw));
      }}
      className={className}
    />
  );
}
