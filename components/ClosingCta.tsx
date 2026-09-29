import { ButtonLink } from './ui/Button';
import { Section } from './ui/Section';

/**
 * The blue closing band. Onramper uses the brand blue exactly once, here, at
 * the bottom of the page, so it does the whole job of the colour in one go.
 */
export function ClosingCta({
  title,
  standfirst,
  primary,
  secondary,
}: {
  title: string;
  standfirst?: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <Section tone="blue" size="lg" labelledBy="closing-cta">
      <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[46rem]">
          <h2 id="closing-cta" className="text-display">
            {title}
          </h2>
          {standfirst && <p className="mt-8 max-w-content text-lead text-ink-2">{standfirst}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <ButtonLink href={primary.href} variant="primary" size="lg">
            {primary.label}
          </ButtonLink>
          {secondary && (
            <ButtonLink href={secondary.href} variant="secondary" size="lg">
              {secondary.label}
            </ButtonLink>
          )}
        </div>
      </div>
    </Section>
  );
}
