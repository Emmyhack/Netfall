import Link from 'next/link';

/**
 * The action primitive. Both reference sites use a fully rounded pill for
 * every action — MetaMask at 100px radius, Onramper at 123px — so that shape
 * is the single constant across buttons, chips and CTAs here.
 */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'brand'
  | 'best'
  | 'ghost'
  | 'band'
  | 'band-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  // Onramper's filled near-black pill.
  primary: 'bg-ink text-paper border border-ink hover:opacity-85',
  // Onramper's white companion pill.
  secondary: 'bg-surface text-ink border border-rule-2 hover:bg-surface-2',
  // Brand blue. Dark type, because white on #0093FF is 3.17:1.
  brand: 'bg-brand text-on-brand border border-brand hover:opacity-85',
  // The handoff on the winning row: Onramper's mint, dark type.
  best: 'bg-mint text-on-mint border border-mint hover:opacity-85',
  ghost: 'bg-transparent text-ink border border-rule-2 hover:bg-surface-2',
  // Inside a band. Each band declares its own pair, because a white pill
  // reads on blue and vanishes on mint.
  band: 'border hover:opacity-85 [background-color:var(--band-btn-bg)] [color:var(--band-btn-fg)] [border-color:var(--band-btn-bg)]',
  'band-ghost': 'bg-transparent text-ink border border-ink-2 hover:opacity-70',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-3 text-sm',
  lg: 'px-6 py-4 text-base',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-pill font-medium leading-none ' +
  'whitespace-nowrap transition-opacity transition-colors disabled:opacity-50 ' +
  'disabled:pointer-events-none';

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className = '',
): string {
  return [BASE, VARIANTS[variant], SIZES[size], className].join(' ');
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant, size, className, children, ...rest }: ButtonProps) {
  return (
    <button {...rest} className={buttonClass(variant, size, className)}>
      {children}
    </button>
  );
}

export interface ButtonLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function ButtonLink({ variant, size, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link {...rest} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/** A non-interactive label in the same pill shape. */
export function Pill({
  children,
  className,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'neutral' | 'best' | 'caution' | 'band';
}) {
  const tones = {
    neutral: 'border-rule-2 text-ink-2',
    best: 'border-best text-best',
    caution: 'border-caution bg-caution-soft text-caution',
    band: 'border-ink-2 text-ink-2',
  } as const;

  return (
    <span
      className={[
        'inline-flex items-center rounded-pill border px-3 py-1 text-xs font-medium',
        tones[tone],
        className ?? '',
      ].join(' ')}
    >
      {children}
    </span>
  );
}
