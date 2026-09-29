'use client';

import { useUrlParam } from '@/lib/hooks/useUrlSearchParams';
import { RateAlertForm } from './RateAlertForm';

/**
 * Corridor pages link through with ?corridor=, so the form opens on the
 * corridor the visitor was just looking at. The parameter arrives just after
 * mount, and the form is keyed on it so it picks up the right corridor
 * without an adoption dance inside the form itself.
 */
export function AlertsCorridorBridge() {
  const corridor = useUrlParam('corridor');
  return <RateAlertForm key={corridor ?? 'default'} defaultCorridor={corridor ?? undefined} />;
}
