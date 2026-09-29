import { Suspense } from 'react';
import { DevScenarioHarness } from '@/components/dev/DevScenarioHarness';

export const metadata = { title: 'Scenarios' };

export default function DevScenariosPage() {
  return (
    <Suspense fallback={null}>
      <DevScenarioHarness />
    </Suspense>
  );
}
