'use client';

import { useEffect, useId, useState } from 'react';
import { applyTheme, readStoredTheme, type ThemePreference } from '@/lib/theme';

const OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Auto' },
];

/**
 * Three explicit choices rather than a two-state switch, because "system" is
 * a real preference a toggle cannot express. Shaped as a pill segment to match
 * every other control.
 */
export function ThemeToggle() {
  const groupId = useId();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPreference(readStoredTheme());
    setMounted(true);
  }, []);

  const choose = (value: ThemePreference) => {
    setPreference(value);
    applyTheme(value);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex items-center rounded-pill border border-rule bg-surface p-px"
    >
      {OPTIONS.map((option) => {
        const selected = mounted && preference === option.value;
        return (
          <button
            key={option.value}
            id={`${groupId}-${option.value}`}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => choose(option.value)}
            className={[
              'rounded-pill px-3 py-2 text-xs font-medium transition-colors',
              selected ? 'bg-ink text-paper' : 'text-ink-3 hover:text-ink',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
