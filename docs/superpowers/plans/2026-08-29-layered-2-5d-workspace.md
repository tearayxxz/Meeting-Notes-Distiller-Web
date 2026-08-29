# Layered 2.5D Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an adaptive, accessible layered 2.5D interface with focused pointer tilt and Light/Dark celestial transitions while preserving every meeting-analysis workflow.

**Architecture:** A pure depth-geometry module feeds one reusable Motion-powered `TiltSurface`; CSS custom properties adapt its perspective, shadow, and glare to Light, Dark, and Web-Slinger themes. `CelestialTransition` is an independent, non-blocking overlay orchestrated by the existing theme change handler; backend, contracts, extraction, and reports remain unchanged.

**Tech Stack:** React 19, TypeScript 5.9, Motion 13, Tailwind CSS 4, shadcn/ui, Lucide React, Vitest, Testing Library, and Playwright.

**Spec:** `docs/superpowers/specs/2026-08-29-layered-2-5d-workspace-design.md`

## Global Constraints

- This is a frontend-only progressive enhancement; do not modify backend, extraction, shared contracts, uploads, or DOCX generation.
- Use the existing `motion` dependency; add no Three.js, WebGL, tilt package, image asset, or runtime dependency.
- Cap pointer rotation at six degrees and keep readable content in a single surface plane.
- Enable pointer tracking only when `(hover: hover) and (pointer: fine)` matches.
- Touch behavior is press/lift only; never request gyroscope or device-orientation permission.
- `prefers-reduced-motion: reduce` disables tracking and moving celestial/Web-Slinger overlays while retaining static depth.
- Theme selection must update immediately and persist through the existing `meeting-distiller-theme` localStorage key.
- Decorative overlays and pseudo-elements must use `pointer-events: none`.
- Analysis and report requests must start immediately; no visual effect may gate application work.
- Preserve the intentional meeting-selector horizontal scroller while preventing page-level horizontal overflow.

---

## File Map

### Create

- `frontend/src/lib/depth.ts` — pure tilt normalization and rotation-cap calculations.
- `frontend/src/components/TiltSurface.tsx` — reusable pointer/touch depth primitive.
- `frontend/src/components/CelestialTransition.tsx` — replayable Light/Dark transition overlay.
- `tests/frontend/depth.test.ts` — pure geometry coverage.
- `tests/frontend/tilt-surface.test.tsx` — component semantics and capability fallbacks.
- `tests/frontend/celestial-transition.test.tsx` — overlay direction and rendering coverage.

### Modify

- `.gitignore` — exclude local `.superpowers/` visual-companion sessions.
- `frontend/src/App.tsx` — celestial orchestration and report-surface depth integration.
- `frontend/src/index.css` — adaptive tokens, surface layers, celestial visuals, and fallbacks.
- `frontend/src/components/UploadZone.tsx` — strong TiltSurface integration.
- `frontend/src/components/FileQueue.tsx` — strong TiltSurface integration.
- `frontend/src/components/MeetingCard.tsx` — selected-result TiltSurface integration and static warning depth.
- `frontend/src/components/ProblemPanel.tsx` — grouped problem-surface depth.
- `frontend/src/components/ThemeSwitcher.tsx` — calm static depth hook.
- `frontend/src/components/MeetingNavigator.tsx` — calm navigator depth hook without nested tracking.
- `tests/frontend/app.test.tsx` — theme orchestration and focused-surface integration tests.
- `e2e/meeting-analysis.spec.ts` — real pointer, celestial, mobile fallback, and unchanged workflow tests.
- `README.md` — 2.5D behavior, accessibility, and limitation documentation.

---

### Task 1: Secure and Commit the Existing Theme Baseline

**Files:**
- Modify: `.gitignore`
- Verify and commit: `README.md`
- Verify and commit: `frontend/src/App.tsx`
- Verify and commit: `frontend/src/index.css`
- Verify and commit: `frontend/src/components/ThemeSwitcher.tsx`
- Verify and commit: `frontend/src/components/WebSlingerEffects.tsx`
- Verify and commit: `frontend/src/lib/theme.ts`
- Verify and commit: existing theme-related component hooks and tests shown by `git status`

**Interfaces:**
- Consumes: current uncommitted Light/Dark/Web-Slinger implementation and tests.
- Produces: committed theme foundation with `Theme`, `useTheme()`, `ThemeSwitcher`, `WebSlingerEffect`, and `.superpowers/` ignored.

- [ ] **Step 1: Prove visual-companion files are not yet ignored**

Run:

```bash
git check-ignore --no-index .superpowers/probe
```

Expected: exit code `1` and no matching path.

- [ ] **Step 2: Add the local planning directory to `.gitignore`**

Append exactly:

```gitignore
.superpowers/
```

- [ ] **Step 3: Verify the ignore rule**

Run:

```bash
git check-ignore --no-index .superpowers/probe
```

Expected: exit code `0` and output `.superpowers/probe`.

- [ ] **Step 4: Verify the current theme baseline before committing it**

Run:

```bash
npm run verify
```

Expected: lint passes; all Vitest files pass; all Playwright tests pass; frontend/backend/shared build; all three Office artifacts pass structural validation.

- [ ] **Step 5: Confirm only approved theme files are selected**

Run:

```bash
git status --short
git diff --check
```

Expected: `.superpowers/` is absent; no whitespace errors; only the known theme/frontend/test/README changes remain.

- [ ] **Step 6: Commit the prerequisite theme feature**

```bash
git add -- .gitignore README.md e2e/meeting-analysis.spec.ts frontend/src/App.tsx frontend/src/index.css frontend/src/components/FileQueue.tsx frontend/src/components/GlobalActions.tsx frontend/src/components/MeetingCard.tsx frontend/src/components/MeetingNavigator.tsx frontend/src/components/ProblemPanel.tsx frontend/src/components/ThemeSwitcher.tsx frontend/src/components/UploadZone.tsx frontend/src/components/WebSlingerEffects.tsx frontend/src/lib/theme.ts tests/frontend/app.test.tsx
git diff --cached --check
git commit -m "feat(ui): add persistent web-slinger theme"
```

Expected: the design commit remains separate and the theme baseline becomes one focused commit.

---

### Task 2: Add Pure Tilt Geometry

**Files:**
- Create: `frontend/src/lib/depth.ts`
- Create: `tests/frontend/depth.test.ts`

**Interfaces:**
- Consumes: numeric pointer coordinates, a `TiltBounds`, and maximum degrees.
- Produces: `calculateTilt(input: TiltInput, bounds: TiltBounds, maxRotation: number): TiltRotation`.

- [ ] **Step 1: Write the failing geometry tests**

Create `tests/frontend/depth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calculateTilt } from '../../frontend/src/lib/depth.js';

const bounds = { left: 0, top: 0, width: 100, height: 50 };

describe('calculateTilt', () => {
  it('returns neutral rotation at the center', () => {
    expect(calculateTilt({ clientX: 50, clientY: 25 }, bounds, 6)).toEqual({
      normalizedX: 0,
      normalizedY: 0,
      rotateX: 0,
      rotateY: 0,
    });
  });

  it('maps the top-right corner to the configured cap', () => {
    expect(calculateTilt({ clientX: 100, clientY: 0 }, bounds, 6)).toEqual({
      normalizedX: 1,
      normalizedY: -1,
      rotateX: 6,
      rotateY: 6,
    });
  });

  it('clamps coordinates outside the surface bounds', () => {
    const result = calculateTilt({ clientX: 400, clientY: 400 }, bounds, 4);
    expect(result).toEqual({ normalizedX: 1, normalizedY: 1, rotateX: -4, rotateY: 4 });
  });

  it('returns neutral values for zero-sized bounds', () => {
    expect(calculateTilt({ clientX: 20, clientY: 20 }, { ...bounds, width: 0 }, 6)).toEqual({
      normalizedX: 0,
      normalizedY: 0,
      rotateX: 0,
      rotateY: 0,
    });
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- --run tests/frontend/depth.test.ts
```

Expected: FAIL because `frontend/src/lib/depth.ts` does not exist.

- [ ] **Step 3: Implement the pure calculation**

Create `frontend/src/lib/depth.ts`:

```ts
export interface TiltInput {
  clientX: number;
  clientY: number;
}

export interface TiltBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TiltRotation {
  normalizedX: number;
  normalizedY: number;
  rotateX: number;
  rotateY: number;
}

const clamp = (value: number): number => Math.max(-1, Math.min(1, value));

export function calculateTilt(
  input: TiltInput,
  bounds: TiltBounds,
  maxRotation: number,
): TiltRotation {
  if (bounds.width <= 0 || bounds.height <= 0 || maxRotation <= 0) {
    return { normalizedX: 0, normalizedY: 0, rotateX: 0, rotateY: 0 };
  }

  const normalizedX = clamp(((input.clientX - bounds.left) / bounds.width) * 2 - 1);
  const normalizedY = clamp(((input.clientY - bounds.top) / bounds.height) * 2 - 1);

  return {
    normalizedX,
    normalizedY,
    rotateX: -normalizedY * maxRotation,
    rotateY: normalizedX * maxRotation,
  };
}
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm test -- --run tests/frontend/depth.test.ts
npm run typecheck
```

Expected: four geometry tests pass and all workspaces typecheck.

- [ ] **Step 5: Commit the geometry unit**

```bash
git add -- frontend/src/lib/depth.ts tests/frontend/depth.test.ts
git diff --cached --check
git commit -m "feat(ui): add bounded tilt geometry"
```

---

### Task 3: Build the Motion-Powered TiltSurface

**Files:**
- Create: `frontend/src/components/TiltSurface.tsx`
- Create: `tests/frontend/tilt-surface.test.tsx`

**Interfaces:**
- Consumes: `calculateTilt`, CSS token `--depth-max-rotate`, child content, and pointer events.
- Produces: `TiltSurface({ depth, glare, children, ...divProps })`, with `depth: 'calm' | 'strong'` and stable `data-depth`, `data-tilt-enabled`, and `data-tilt-active` attributes.

- [ ] **Step 1: Write a matchMedia test utility and failing component tests**

Create `tests/frontend/tilt-surface.test.tsx`:

```tsx
// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TiltSurface } from '../../frontend/src/components/TiltSurface.js';

const motionState = vi.hoisted(() => ({ reduced: false }));

vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
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
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- --run tests/frontend/tilt-surface.test.tsx
```

Expected: FAIL because `TiltSurface.tsx` does not exist.

- [ ] **Step 3: Implement TiltSurface without React pointer state**

Create `frontend/src/components/TiltSurface.tsx` with this public shape and event flow:

```tsx
import { useRef, type ComponentPropsWithoutRef, type PointerEvent } from 'react';
import {
  motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform,
} from 'motion/react';
import { calculateTilt, type TiltBounds } from '@/lib/depth';
import { cn } from '@/lib/utils';

export type DepthStrength = 'calm' | 'strong';

interface TiltSurfaceProps extends ComponentPropsWithoutRef<'div'> {
  depth?: DepthStrength;
  glare?: boolean;
}

export function TiltSurface({
  children, className, depth = 'strong', glare = true, style,
  onPointerEnter, onPointerMove, onPointerLeave, onPointerCancel,
  onPointerDown, onPointerUp, ...props
}: TiltSurfaceProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const finePointer = typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const trackingEnabled = finePointer && !reduceMotion;
  const bounds = useRef<TiltBounds | null>(null);
  const maxRotation = useRef(4);
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rawLift = useMotionValue(0);
  const normalizedX = useMotionValue(0);
  const normalizedY = useMotionValue(0);
  const rotateX = useSpring(rawRotateX, { stiffness: 260, damping: 28 });
  const rotateY = useSpring(rawRotateY, { stiffness: 260, damping: 28 });
  const y = useSpring(rawLift, { stiffness: 300, damping: 30 });
  const shadowX = useTransform(rotateY, (value) => value * 1.15);
  const shadowY = useTransform(rotateX, (value) => 14 - value * 0.45);
  const boxShadow = useMotionTemplate`${shadowX}px ${shadowY}px 26px var(--depth-shadow-color)`;
  const glareX = useTransform(normalizedX, [-1, 1], [20, 80]);
  const glareY = useTransform(normalizedY, [-1, 1], [20, 80]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, var(--depth-glare-color), transparent 42%)`;

  const reset = (element: HTMLDivElement): void => {
    bounds.current = null;
    rawRotateX.set(0);
    rawRotateY.set(0);
    rawLift.set(0);
    normalizedX.set(0);
    normalizedY.set(0);
    element.dataset.tiltActive = 'false';
  };

  const enter = (event: PointerEvent<HTMLDivElement>): void => {
    if (trackingEnabled && event.pointerType !== 'touch') {
      bounds.current = event.currentTarget.getBoundingClientRect();
      const token = getComputedStyle(event.currentTarget).getPropertyValue('--depth-max-rotate');
      maxRotation.current = Number.parseFloat(token) || 4;
      rawLift.set(-4);
      event.currentTarget.dataset.tiltActive = 'true';
    }
    onPointerEnter?.(event);
  };

  const move = (event: PointerEvent<HTMLDivElement>): void => {
    if (trackingEnabled && bounds.current && event.pointerType !== 'touch') {
      const tilt = calculateTilt(event, bounds.current, Math.min(6, maxRotation.current));
      rawRotateX.set(tilt.rotateX);
      rawRotateY.set(tilt.rotateY);
      normalizedX.set(tilt.normalizedX);
      normalizedY.set(tilt.normalizedY);
    }
    onPointerMove?.(event);
  };

  return (
    <motion.div
      {...props}
      className={cn('tilt-surface', className)}
      data-depth={depth}
      data-tilt-enabled={trackingEnabled ? 'true' : 'false'}
      data-tilt-active="false"
      style={{ ...style, rotateX, rotateY, y, boxShadow, transformPerspective: 'var(--depth-perspective)' }}
      onPointerEnter={enter}
      onPointerMove={move}
      onPointerLeave={(event) => { reset(event.currentTarget); onPointerLeave?.(event); }}
      onPointerCancel={(event) => { reset(event.currentTarget); onPointerCancel?.(event); }}
      onPointerDown={(event) => { if (!reduceMotion && !trackingEnabled) rawLift.set(-2); onPointerDown?.(event); }}
      onPointerUp={(event) => { if (!trackingEnabled) rawLift.set(0); onPointerUp?.(event); }}
    >
      {children}
      {glare ? <motion.span className="tilt-glare" aria-hidden="true" style={{ background: glareBackground }} /> : null}
    </motion.div>
  );
}
```

During implementation, preserve the exact public prop names and data attributes. Resolve only TypeScript/Motion style typing details; do not add behavior beyond the spec.

- [ ] **Step 4: Verify GREEN and existing component behavior**

Run:

```bash
npm test -- --run tests/frontend/depth.test.ts tests/frontend/tilt-surface.test.tsx tests/frontend/app.test.tsx
npm run lint
npm run typecheck
```

Expected: all focused tests pass, lint has zero warnings, and TypeScript succeeds.

- [ ] **Step 5: Commit the reusable primitive**

```bash
git add -- frontend/src/components/TiltSurface.tsx tests/frontend/tilt-surface.test.tsx
git diff --cached --check
git commit -m "feat(ui): add accessible tilt surface"
```

---

### Task 4: Add the Light/Dark Celestial Transition

**Files:**
- Create: `frontend/src/components/CelestialTransition.tsx`
- Create: `tests/frontend/celestial-transition.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/index.css`
- Modify: `tests/frontend/app.test.tsx`
- Modify: `e2e/meeting-analysis.spec.ts`

**Interfaces:**
- Consumes: current `Theme`, `changeTheme(nextTheme)`, and a monotonically increasing run identifier.
- Produces: `CelestialTransition({ runId, direction })`, where `direction` is `'to-dark' | 'to-light' | null`.

- [ ] **Step 1: Write failing overlay tests**

Create `tests/frontend/celestial-transition.test.tsx`:

```tsx
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
```

Add this test to `tests/frontend/app.test.tsx`:

```tsx
it('runs opposite celestial transitions only between Light and Dark', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: 'Dark theme' }));
  expect(screen.getByTestId('celestial-transition')).toHaveAttribute('data-direction', 'to-dark');

  await user.click(screen.getByRole('button', { name: 'Light theme' }));
  expect(screen.getByTestId('celestial-transition')).toHaveAttribute('data-direction', 'to-light');

  await user.click(screen.getByRole('button', { name: 'Web-Slinger theme' }));
  expect(screen.queryByTestId('celestial-transition')).not.toBeInTheDocument();
});
```

Add this browser-level acceptance test to `e2e/meeting-analysis.spec.ts`:

```ts
test('runs and clears both Light/Dark celestial directions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await expect(page.getByTestId('celestial-transition')).toHaveAttribute('data-direction', 'to-dark');
  await expect(page.getByTestId('celestial-transition')).toBeHidden({ timeout: 2_000 });

  await page.getByRole('button', { name: 'Light theme' }).click();
  await expect(page.getByTestId('celestial-transition')).toHaveAttribute('data-direction', 'to-light');
  await expect(page.getByTestId('celestial-transition')).toBeHidden({ timeout: 2_000 });
});
```

- [ ] **Step 2: Run both files and verify RED**

Run:

```bash
npm test -- --run tests/frontend/celestial-transition.test.tsx tests/frontend/app.test.tsx
npm run e2e -- --grep "Light/Dark celestial directions"
```

Expected: Vitest and Playwright fail because the overlay module and App orchestration do not exist.

- [ ] **Step 3: Implement the overlay component**

Create `frontend/src/components/CelestialTransition.tsx`:

```tsx
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
```

- [ ] **Step 4: Orchestrate direction without delaying theme state**

In `frontend/src/App.tsx`, add:

```ts
const [celestial, setCelestial] = useState<{
  runId: number;
  direction: CelestialDirection | null;
}>({ runId: 0, direction: null });

const changeTheme = (nextTheme: Theme): void => {
  const direction = theme === 'light' && nextTheme === 'dark'
    ? 'to-dark'
    : theme === 'dark' && nextTheme === 'light'
      ? 'to-light'
      : null;

  setTheme(nextTheme);
  setCelestial((current) => ({ runId: current.runId + 1, direction }));
  if (nextTheme === 'web-slinger') setWebEffectRun((run) => run + 1);
};
```

Render `<CelestialTransition runId={celestial.runId} direction={celestial.direction} />` beside `WebSlingerEffect` at the app shell root. Import `CelestialDirection` as a type.

- [ ] **Step 5: Add exact non-blocking CSS choreography**

Add to `frontend/src/index.css`:

```css
.celestial-transition {
  position: fixed;
  z-index: 55;
  inset: 0 0 auto;
  height: 11rem;
  overflow: hidden;
  visibility: visible;
  pointer-events: none;
  animation: celestial-dismiss 160ms 760ms ease-in forwards;
}

.celestial-horizon {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 35%, color-mix(in oklch, var(--background), transparent 30%));
}

.celestial-body {
  position: absolute;
  width: 3.25rem;
  height: 3.25rem;
  filter: drop-shadow(0 8px 14px rgb(8 18 40 / 28%));
}

.celestial-sun { color: oklch(0.82 0.18 82); }
.celestial-moon { color: oklch(0.82 0.08 252); }
.celestial-transition[data-direction="to-dark"] .celestial-sun { animation: celestial-set 760ms ease-in-out forwards; }
.celestial-transition[data-direction="to-dark"] .celestial-moon { animation: celestial-rise 760ms ease-in-out forwards; }
.celestial-transition[data-direction="to-light"] .celestial-sun { animation: celestial-rise 760ms ease-in-out forwards; }
.celestial-transition[data-direction="to-light"] .celestial-moon { animation: celestial-set 760ms ease-in-out forwards; }

@keyframes celestial-set {
  from { opacity: 1; transform: translate(18vw, 0) rotate(0); }
  to { opacity: 0; transform: translate(45vw, 10rem) rotate(35deg); }
}

@keyframes celestial-rise {
  from { opacity: 0; transform: translate(55vw, 10rem) rotate(-25deg); }
  to { opacity: 1; transform: translate(82vw, 0) rotate(0); }
}

@keyframes celestial-dismiss {
  to { visibility: hidden; opacity: 0; }
}
```

Add `.celestial-transition { display: none; }` inside the existing reduced-motion media query.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npm test -- --run tests/frontend/celestial-transition.test.tsx tests/frontend/app.test.tsx
npm run e2e -- --grep "Light/Dark celestial directions"
npm run lint
npm run build
```

Expected: overlay, App, and browser tests pass; lint passes; production build succeeds.

- [ ] **Step 7: Commit the celestial transition**

```bash
git add -- frontend/src/App.tsx frontend/src/components/CelestialTransition.tsx frontend/src/index.css tests/frontend/app.test.tsx tests/frontend/celestial-transition.test.tsx e2e/meeting-analysis.spec.ts
git diff --cached --check
git commit -m "feat(ui): animate light and dark horizon"
```

---

### Task 5: Integrate Adaptive Focused Depth

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/UploadZone.tsx`
- Modify: `frontend/src/components/FileQueue.tsx`
- Modify: `frontend/src/components/MeetingCard.tsx`
- Modify: `frontend/src/components/ProblemPanel.tsx`
- Modify: `frontend/src/components/ThemeSwitcher.tsx`
- Modify: `frontend/src/components/MeetingNavigator.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `tests/frontend/app.test.tsx`
- Modify: `e2e/meeting-analysis.spec.ts`

**Interfaces:**
- Consumes: `TiltSurface` from Task 3 and existing semantic dashboard components.
- Produces: focus hierarchy identified by `data-testid` values `upload-tilt-surface`, `queue-tilt-surface`, `meeting-tilt-surface`, `problems-tilt-surface`, and `report-tilt-surface`.

- [ ] **Step 1: Write the failing surface-integration test**

Add to `tests/frontend/app.test.tsx`:

```tsx
it('applies focused depth to upload and analyzed-result surfaces', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(batch), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })));
  render(<App />);

  expect(screen.getByTestId('upload-tilt-surface')).toHaveAttribute('data-depth', 'strong');
  expect(screen.getByTestId('queue-tilt-surface')).toHaveAttribute('data-depth', 'strong');

  await user.upload(
    screen.getByLabelText('Choose transcript files'),
    new File(['Alice: We decided to launch Friday.'], 'launch.txt', { type: 'text/plain' }),
  );
  await user.click(screen.getByRole('button', { name: 'Analyze Meetings' }));

  expect(await screen.findByTestId('meeting-tilt-surface')).toHaveAttribute('data-depth', 'strong');
  expect(screen.getByTestId('report-tilt-surface')).toHaveAttribute('data-depth', 'strong');
});
```

In `e2e/meeting-analysis.spec.ts`, import `devices` from `@playwright/test` and add:

```ts
test('tilts only the focused upload surface under a fine pointer', async ({ page }) => {
  await page.goto('/');
  const surface = page.getByTestId('upload-tilt-surface');
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error('Upload tilt surface has no bounding box.');

  await page.mouse.move(box.x + box.width - 8, box.y + 8);
  await expect(surface).toHaveAttribute('data-tilt-active', 'true');
  await expect.poll(() => surface.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe('none');

  await page.mouse.move(1, 1);
  await expect(surface).toHaveAttribute('data-tilt-active', 'false');
  await expect(page.getByTestId('queue-tilt-surface')).toHaveAttribute('data-tilt-active', 'false');
});

test('uses static depth without page overflow on touch mobile', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/');

  await expect(page.getByTestId('upload-tilt-surface')).toHaveAttribute('data-tilt-enabled', 'false');
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);

  await context.close();
});
```

- [ ] **Step 2: Run the integration test and verify RED**

Run:

```bash
npm test -- --run tests/frontend/app.test.tsx
npm run e2e -- --grep "focused upload surface|static depth"
```

Expected: Vitest and Playwright fail because the named tilt surfaces are absent.

- [ ] **Step 3: Wrap only the approved tracking surfaces**

Apply these exact ownership rules:

```tsx
// UploadZone.tsx
<TiltSurface data-testid="upload-tilt-surface" depth="strong" className="h-full" glare>
  <div className="upload-zone ...">...</div>
</TiltSurface>

// FileQueue.tsx
<TiltSurface data-testid="queue-tilt-surface" depth="strong" className="h-full" glare={false}>
  <Card className="web-theme-panel h-full" ...>...</Card>
</TiltSurface>

// MeetingCard.tsx
<TiltSurface data-testid="meeting-tilt-surface" depth="strong" glare={false}>
  <Card className="meeting-result-card web-theme-panel">...</Card>
</TiltSurface>

// ProblemPanel.tsx
<TiltSurface data-testid="problems-tilt-surface" depth="strong" glare={false}>
  <div className="flex flex-col gap-3">...</div>
</TiltSurface>

// App.tsx report panel
<TiltSurface data-testid="report-tilt-surface" depth="strong" glare={false}>
  <div className="report-panel ...">...</div>
</TiltSurface>
```

Do not nest TiltSurface around warning alerts inside MeetingCard; give those existing `.problem-alert` elements static lifted styling. Keep ThemeSwitcher, tabs, and MeetingNavigator as calm static-depth classes rather than pointer-tracking surfaces.

- [ ] **Step 4: Define adaptive theme tokens and surface styles**

Add these token groups to `frontend/src/index.css`:

```css
:root {
  --depth-perspective: 950px;
  --depth-max-rotate: 4;
  --depth-shadow-color: rgb(24 39 74 / 16%);
  --depth-glare-color: rgb(255 255 255 / 52%);
}

.dark {
  --depth-perspective: 1000px;
  --depth-max-rotate: 4;
  --depth-shadow-color: rgb(0 0 0 / 46%);
  --depth-glare-color: rgb(150 181 255 / 13%);
}

html[data-theme="web-slinger"] {
  --depth-perspective: 880px;
  --depth-max-rotate: 6;
  --depth-shadow-color: rgb(7 18 44 / 34%);
  --depth-glare-color: rgb(255 226 102 / 24%);
}

.tilt-surface {
  position: relative;
  transform-style: preserve-3d;
  border-radius: var(--radius-xl);
  will-change: transform;
}

.tilt-surface > :not(.tilt-glare) {
  position: relative;
  z-index: 1;
}

.tilt-glare {
  position: absolute;
  z-index: 2;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  opacity: 0;
  pointer-events: none;
  transition: opacity 160ms ease;
}

.tilt-surface[data-tilt-active="true"] .tilt-glare { opacity: 1; }

.theme-switcher,
.analysis-workspace,
.meeting-navigator-panel {
  transform: translateZ(0);
  box-shadow: var(--depth-static-shadow, 0 8px 24px rgb(24 39 74 / 10%));
}

.problem-alert {
  transform: translateZ(0);
  box-shadow: 0 8px 22px var(--depth-shadow-color);
}
```

Inside the existing reduced-motion media query, add:

```css
.tilt-surface {
  transform: none !important;
  will-change: auto;
}
.tilt-glare { display: none; }
```

- [ ] **Step 5: Verify GREEN and regression behavior**

Run:

```bash
npm test -- --run tests/frontend/depth.test.ts tests/frontend/tilt-surface.test.tsx tests/frontend/celestial-transition.test.tsx tests/frontend/app.test.tsx
npm run e2e -- --grep "focused upload surface|static depth"
npm run lint
npm run build
```

Expected: focused surfaces are present; Vitest, Playwright, lint, and build pass.

- [ ] **Step 6: Commit focused integration**

```bash
git add -- frontend/src/App.tsx frontend/src/index.css frontend/src/components/UploadZone.tsx frontend/src/components/FileQueue.tsx frontend/src/components/MeetingCard.tsx frontend/src/components/ProblemPanel.tsx frontend/src/components/ThemeSwitcher.tsx frontend/src/components/MeetingNavigator.tsx tests/frontend/app.test.tsx e2e/meeting-analysis.spec.ts
git diff --cached --check
git commit -m "feat(ui): layer focused dashboard depth"
```

---

### Task 6: Document, Verify, and Visually Review the Feature

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: completed and automated behavior from Tasks 2–5.
- Produces: accurate user documentation and real-browser evidence for all three themes, desktop pointer behavior, touch fallback, analysis continuity, and no page overflow.

- [ ] **Step 1: Document the implemented behavior accurately**

Update README Features with:

```markdown
- Adaptive layered 2.5D depth across Light, Dark, and Web-Slinger themes, with bounded desktop pointer tilt, touch-safe press feedback, and reduced-motion static fallbacks.
- Non-blocking sun/moon horizon transitions for direct Light/Dark switching.
```

Update Architecture to describe `TiltSurface`, pure depth geometry, CSS theme tokens, and `CelestialTransition`. Add this limitation:

```markdown
- The interface uses CSS/Motion 2.5D perspective rather than WebGL or true 3D models; touch devices intentionally omit pointer and gyroscope tracking.
```

- [ ] **Step 2: Run complete automated verification**

```bash
npm run verify
git diff --check
```

Expected: lint passes; all unit/API/component tests pass; build passes; all Playwright tests pass; all Office artifacts remain structurally valid; diff check is clean.

- [ ] **Step 3: Perform real-browser visual QA**

Start the application:

```bash
npm run dev
```

Using the in-app browser, verify these observable outcomes at desktop width and a 390×844 viewport:

1. Light, Dark, and Web-Slinger all retain readable contrast.
2. Light/Dark celestial bodies follow the approved direction and disappear after one pass.
3. Upload, file queue, selected meeting, warnings, and report panel show focused hierarchy.
4. Desktop pointer tilt never exceeds the six-degree unit-tested cap and springs back on leave.
5. Mobile has no page-level horizontal overflow; only the meeting selector remains intentionally scrollable.
6. Upload four instructor fixtures, analyze, switch meetings, open Problems and Owners tabs, and download a report.
7. Browser console contains zero errors and zero warnings caused by the feature.

If QA reveals a defect, add a failing automated regression test, verify RED, make the smallest fix, and rerun `npm run verify` before continuing.

- [ ] **Step 4: Commit documentation after QA passes**

```bash
git add -- README.md
git diff --cached --check
git commit -m "docs: explain layered 2.5d workspace"
```

---

### Task 7: Final Branch Review

**Files:**
- Review only: all files changed since `1fed087`.

**Interfaces:**
- Consumes: completed Tasks 1–6.
- Produces: evidence-backed, review-ready branch with no generated visual-companion files tracked.

- [ ] **Step 1: Run the final verification gate from a clean server state**

```bash
npm ci
npm run verify
```

Expected: dependency installation succeeds; lint passes; all tests and E2E pass; build succeeds; Office artifacts validate.

- [ ] **Step 2: Review repository hygiene**

```bash
git status --short --branch
git diff --check
git log --oneline --decorate -8
git ls-files .superpowers
```

Expected: no uncommitted implementation files, no whitespace errors, focused commits are visible, and `git ls-files .superpowers` returns no paths.

- [ ] **Step 3: Review the complete feature diff**

```bash
git diff 1fed087..HEAD --stat
git diff 1fed087..HEAD -- frontend/src tests/frontend e2e README.md .gitignore
```

Check for debug output, uncapped transforms, pointer-intercepting decorations, stale test selectors, undocumented behavior, and accidental backend/shared changes.

- [ ] **Step 4: Record the verified handoff**

Do not create an empty commit. Report the exact branch, latest commit, `npm ci` result, test counts, Playwright count, build result, artifact validation, browser widths, console result, and remaining limitations. Keep the branch unmerged until the user explicitly requests merge or push.
