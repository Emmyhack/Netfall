export type SectionTone = 'paper' | 'white' | 'blue';

const TONES: Record<SectionTone, string> = {
  paper: 'sec-paper',
  white: 'sec-white',
  blue: 'sec-blue',
};

/**
 * Page rhythm, following onramper.com: full-bleed sections alternating
 * between the page lavender and white, with the brand blue used exactly once
 * for the closing call to action.
 */
export function Section({
  children,
  tone = 'paper',
  className,
  id,
  labelledBy,
  size = 'md',
}: {
  children: React.ReactNode;
  tone?: SectionTone;
  className?: string;
  id?: string;
  labelledBy?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const padding = { sm: 'py-16', md: 'py-24', lg: 'py-32' }[size];

  return (
    <section id={id} aria-labelledby={labelledBy} className={[TONES[tone], className ?? ''].join(' ')}>
      <div className={['mx-auto max-w-page px-5 sm:px-8', padding].join(' ')}>{children}</div>
    </section>
  );
}

/**
 * The heading pair Onramper uses at the top of every section: a very large
 * heading and a 24px standfirst in the muted grey.
 */
export function SectionHeading({
  id,
  title,
  standfirst,
  size = 'display',
  className,
}: {
  id?: string;
  title: React.ReactNode;
  standfirst?: React.ReactNode;
  /** `display` for a full-width heading, `lg` when it sits in a column. */
  size?: 'display' | 'lg';
  className?: string;
}) {
  return (
    /*
     * The width cap is in rem, not ch. A `ch` unit resolves against the
     * element's own font-size, and on a wrapper at body size that made a 90px
     * heading wrap inside a ~200px column.
     */
    <div className={[size === 'display' ? 'max-w-[54rem]' : 'max-w-[34rem]', className ?? ''].join(' ')}>
      <h2 id={id} className={size === 'display' ? 'text-display text-ink' : 'text-3xl text-ink'}>
        {title}
      </h2>
      {standfirst && (
        <p className={[size === 'display' ? 'mt-8' : 'mt-6', 'max-w-content text-lead text-ink-3'].join(' ')}>
          {standfirst}
        </p>
      )}
    </div>
  );
}
