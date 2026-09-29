import { Section } from '@/components/ui/Section';

/**
 * Route-level loading. Reserves roughly the height of a page hero so the
 * transition into a real page does not jump, and carries no spinner — every
 * other loading state in this product is a skeleton at the true size.
 */
export default function Loading() {
  return (
    <Section tone="paper" size="lg">
      <span className="sr-only" role="status">
        Loading
      </span>
      <div aria-hidden="true" className="space-y-6">
        <div className="h-8 w-48 animate-shimmer rounded-pill bg-surface-2" />
        <div className="h-20 w-full max-w-[40rem] animate-shimmer rounded-sm bg-surface-2" />
        <div className="h-6 w-full max-w-content animate-shimmer rounded-sm bg-surface-2" />
        <div className="h-6 w-3/4 max-w-content animate-shimmer rounded-sm bg-surface-2" />
      </div>
    </Section>
  );
}
