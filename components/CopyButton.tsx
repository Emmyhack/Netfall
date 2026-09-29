'use client';

import { useState } from 'react';

/** The only part of a code snippet that needs to be interactive. */
export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="rounded-pill border px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80"
        style={{ borderColor: 'var(--code-rule)', color: 'var(--code-fg)' }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </>
  );
}
