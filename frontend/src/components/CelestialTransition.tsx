import { Moon, Sun } from 'lucide-react';

export type CelestialDirection = 'to-dark' | 'to-light';

interface CelestialTransitionProps {
  runId: number;
  direction: CelestialDirection | null;
}

export function CelestialTransition({ runId, direction }: CelestialTransitionProps) {
  if (runId === 0 || direction === null) return null;

  return (
    <div
      key={`${direction}-${runId}`}
      className="celestial-transition"
      data-testid="celestial-transition"
      data-direction={direction}
      data-run={runId}
      aria-hidden="true"
    >
      <div className="celestial-horizon" />
      <Sun className="celestial-body celestial-sun" />
      <Moon className="celestial-body celestial-moon" />
    </div>
  );
}
