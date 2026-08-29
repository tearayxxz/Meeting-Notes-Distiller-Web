// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type * as Motion from 'motion/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TiltSurface } from '../../frontend/src/components/TiltSurface.js';

const motionState = vi.hoisted(() => ({ reduced: false }));

vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof Motion>('motion/react');
  return { ...actual, useReducedMotion: () => motionState.reduced };
});

const installMatchMedia = (finePointer: boolean): void => {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query.includes('(hover: hover)') ? finePointer : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
};

afterEach(() => {
  cleanup();
  motionState.reduced = false;
  vi.unstubAllGlobals();
});

describe('TiltSurface', () => {
  it('tracks a fine mouse pointer and resets on leave', () => {
    installMatchMedia(true);
    render(<TiltSurface data-testid="surface"><button>Analyze</button></TiltSurface>);
    const surface = screen.getByTestId('surface');
    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100,
      x: 0, y: 0, toJSON: () => ({}),
    });

    fireEvent.pointerEnter(surface, { pointerType: 'mouse', clientX: 100, clientY: 50 });
    fireEvent.pointerMove(surface, { pointerType: 'mouse', clientX: 190, clientY: 10 });
    expect(surface).toHaveAttribute('data-tilt-enabled', 'true');
    expect(surface).toHaveAttribute('data-tilt-active', 'true');
    expect(screen.getByRole('button', { name: 'Analyze' })).toBeEnabled();

    fireEvent.pointerLeave(surface, { pointerType: 'mouse' });
    expect(surface).toHaveAttribute('data-tilt-active', 'false');
  });

  it('keeps tracking disabled for touch capability', () => {
    installMatchMedia(false);
    render(<TiltSurface data-testid="surface">Content</TiltSurface>);
    const surface = screen.getByTestId('surface');
    fireEvent.pointerEnter(surface, { pointerType: 'touch', clientX: 10, clientY: 10 });
    expect(surface).toHaveAttribute('data-tilt-enabled', 'false');
    expect(surface).toHaveAttribute('data-tilt-active', 'false');
  });

  it('keeps tracking disabled when reduced motion is requested', () => {
    motionState.reduced = true;
    installMatchMedia(true);
    render(<TiltSurface data-testid="surface">Content</TiltSurface>);
    expect(screen.getByTestId('surface')).toHaveAttribute('data-tilt-enabled', 'false');
  });
});
