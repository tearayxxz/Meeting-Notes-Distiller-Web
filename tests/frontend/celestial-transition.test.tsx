// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CelestialTransition } from '../../frontend/src/components/CelestialTransition.js';

afterEach(cleanup);

describe('CelestialTransition', () => {
  it('renders the requested direction and run identifier', () => {
    render(<CelestialTransition runId={2} direction="to-dark" />);
    expect(screen.getByTestId('celestial-transition')).toHaveAttribute('data-direction', 'to-dark');
    expect(screen.getByTestId('celestial-transition')).toHaveAttribute('data-run', '2');
  });

  it('renders nothing without a direct Light/Dark direction', () => {
    render(<CelestialTransition runId={0} direction={null} />);
    expect(screen.queryByTestId('celestial-transition')).not.toBeInTheDocument();
  });
});
