# Layered 2.5D Workspace Design

Date: 2026-08-29
Status: Approved in design review; implementation not started

## Context

Meeting Notes Distiller Web already provides a responsive React dashboard with Light, Dark, and Web-Slinger appearance themes, local theme persistence, Motion-based meeting navigation, and a one-shot Web-Slinger effect. The next enhancement should make the interface feel three-dimensional without turning a task-focused application into a heavy WebGL scene.

The approved direction is a layered 2.5D workspace. Depth must improve hierarchy and feedback while transcript upload, analysis, meeting navigation, warning review, and DOCX download remain direct and readable.

## Goals

- Add a clear but restrained 2.5D visual system to all three themes.
- Use balanced depth with focused hierarchy rather than applying strong motion to every card.
- Provide spring-based pointer tilt on suitable desktop devices.
- Provide touch-safe press feedback without using device orientation or permissions.
- Add a sun-set/moon-rise transition when switching directly between Light and Dark.
- Preserve the existing one-shot Web-Slinger analysis effect.
- Keep every required application action immediately available and non-blocking.
- Preserve offline use and introduce no additional dependency.

## Non-Goals

- No Three.js, React Three Fiber, WebGL scene, 3D model, or externally loaded visual asset.
- No backend, extraction, shared-contract, upload API, DOCX, or document-generation changes.
- No gyroscope or device-orientation access.
- No infinite ambient animation.
- No perspective transform on readable text independent of its containing surface.
- No strong tilt on every result or navigation card.

## Confirmed Design Decisions

| Area | Decision |
|---|---|
| Visual direction | Layered 2.5D Workspace |
| Intensity | Balanced |
| Placement | Focused hierarchy |
| Theme scope | Adaptive across Light, Dark, and Web-Slinger |
| Desktop interaction | Pointer tilt with spring-back |
| Touch interaction | Press/lift only |
| Accessibility | Static depth under reduced motion |
| Animation technology | Existing Motion dependency plus CSS transforms |
| Theme transition | Sun sets and moon rises for direct Light/Dark switching |

## Architecture

The change is a frontend-only progressive enhancement composed of three focused units.

### ThemeEnvironment

The existing `data-theme` value remains the source of truth. ThemeEnvironment is conceptual rather than a new global state store: CSS custom properties map each theme to its depth, lighting, shadow, surface, and glare values.

Light and Dark use calmer depth values. Web-Slinger uses the same primitives with stronger comic shadows and red/blue accents. The component interface remains theme-agnostic.

Representative tokens include:

- `--depth-perspective`
- `--depth-max-rotate`
- `--depth-lift`
- `--depth-shadow-rest`
- `--depth-shadow-active`
- `--depth-glare-color`

### TiltSurface

`TiltSurface` is a reusable React component powered by Motion values and springs. It wraps an existing semantic surface and owns only visual interaction state.

Its responsibilities are:

- Read the pointer position relative to its own bounds.
- Normalize each axis to a `-1` through `1` range.
- Map normalized values to capped `rotateX` and `rotateY` values.
- Apply spring-smoothed rotation, lift, shadow, and optional glare.
- Return all values to neutral on pointer leave, cancellation, or lost focus.
- Disable pointer tracking on touch-only and reduced-motion devices.
- Keep decorative children non-interactive with `pointer-events: none`.

Pointer movement writes to Motion values directly. It must not update React application state or trigger result-tree re-renders.

### CelestialTransition

`CelestialTransition` is a short decorative overlay used only for direct transitions between Light and Dark:

- Light to Dark: sun sets, background tokens crossfade, moon rises.
- Dark to Light: moon sets, background tokens crossfade, sun rises.
- Other transitions: no celestial effect.

The transition lasts approximately 750 milliseconds, uses a run identifier so it can replay, and becomes hidden after completing. It has `aria-hidden="true"` and `pointer-events: none`.

Theme state and localStorage behavior remain owned by the existing theme hook. The overlay observes a theme change but never delays it.

## Focused Surface Integration

Depth is applied according to information priority.

### Strongest depth

- Transcript upload zone while hovered or dragging.
- Uploaded-file queue as the second half of the upload workspace.
- Currently selected meeting result.
- Problem and warning surfaces.
- Download Word Report action panel.

### Calmer depth

- Theme switcher.
- Analysis result tabs.
- Meeting navigator container.
- Selected meeting selector.

### Flat or nearly flat

- Long-form summaries and evidence text.
- Supporting badges and metadata.
- Non-selected meeting selectors.
- Loading and success copy.

This hierarchy prevents simultaneous tilting surfaces from competing for attention.

## Interaction Choreography

### Pointer tilt

1. A fine pointer enters an enabled TiltSurface.
2. The surface lifts by approximately four pixels.
3. Pointer coordinates drive a maximum theme-adjusted rotation of four to six degrees.
4. Shadow direction and optional glare follow the same normalized input.
5. Pointer leave or cancellation springs all values back to neutral.

Only the surface under the pointer actively tracks it.

### Touch

Touch devices receive a small press scale/lift response. They do not receive pointer tracking, gyroscope tracking, or permission prompts.

### Reduced motion

When `prefers-reduced-motion: reduce` is active:

- Pointer tracking is disabled.
- Celestial and Web-Slinger moving overlays are removed or reduced to an immediate static state.
- Static borders and layered shadows preserve the visual hierarchy.
- Existing application transitions resolve with zero or near-zero duration.

### Analysis action

The Analyze Meetings API request begins immediately. Any Web-Slinger visual effect runs in parallel and clears independently. No visual transition can gate processing or results.

## Data Flow

```text
Theme selection
  -> existing theme state and localStorage
  -> data-theme attribute
  -> adaptive 2.5D CSS tokens
  -> optional CelestialTransition run

Pointer event on TiltSurface
  -> surface bounding rectangle
  -> normalized x/y Motion values
  -> spring transforms
  -> rotate/lift/shadow/glare styles
  -> neutral values on leave/cancel
```

Transcript data, structured analysis results, and API payloads never enter the depth layer.

## Performance and Safety

- Animate compositor-friendly `transform` and `opacity` properties.
- Read a surface rectangle when interaction begins and refresh only when required; do not run a layout-measurement loop.
- Keep pointer updates outside React state.
- Avoid WebGL, canvas, image downloads, and new runtime packages.
- Cap rotation to prevent text distortion or motion discomfort.
- Use `overflow-x: clip` at the page shell while preserving the intentional meeting-selector scroller.
- Ensure decorative pseudo-elements and overlays cannot intercept pointer input.
- Preserve semantic elements, keyboard order, focus rings, labels, and screen-reader output.

## Error Handling and Fallbacks

- If fine-pointer or hover media queries do not match, TiltSurface renders static depth.
- If reduced motion is requested, TiltSurface renders static depth.
- If Motion values cannot initialize, the semantic wrapper and all children remain usable with CSS-only shadows.
- If localStorage is unavailable, the theme hook continues with its existing in-memory fallback behavior.
- Animation failure must never alter upload, API, result, navigation, or report state.
- The browser console must not expose recurring animation or pointer errors.

## Testing Strategy

### Unit and component tests

- Pointer center produces neutral rotation.
- Pointer extremes remain within the configured four-to-six-degree cap.
- Pointer leave or cancellation restores neutral targets.
- Tracking is disabled for reduced-motion and non-fine-pointer cases.
- Touch interaction uses press feedback without pointer tilt.
- Light-to-Dark creates the correct celestial direction.
- Dark-to-Light creates the reverse celestial direction.
- Web-Slinger transitions do not create a celestial effect.
- Theme persistence in localStorage remains intact.
- Theme and upload controls remain operable inside decorated containers.

### Playwright tests

- Switch Light to Dark and verify the celestial transition starts and clears.
- Switch Dark to Light and verify the reverse direction.
- Activate a desktop focus surface and verify bounded transform behavior.
- Upload and analyze a transcript while depth is enabled.
- Verify the Web-Slinger effect still runs without blocking analysis.
- Verify narrow mobile layout has no page-level horizontal overflow.
- Verify touch/mobile mode does not apply pointer-tracking transforms.
- Verify no browser console errors or warnings in the tested flow.

### Repository verification

The final implementation must pass:

```text
npm run lint
npm test
npm run build
npm run e2e
npm run verify:artifacts
git diff --check
```

## Expected File Responsibilities

- `frontend/src/components/TiltSurface.tsx`: reusable depth primitive.
- `frontend/src/components/CelestialTransition.tsx`: Light/Dark transition overlay.
- `frontend/src/lib/depth.ts`: pure pointer normalization and cap helpers used by TiltSurface and unit tests.
- `frontend/src/index.css`: adaptive depth tokens, layered surfaces, and static fallbacks.
- `frontend/src/App.tsx`: transition orchestration and focused-surface integration.
- Existing surface components: minimal class or wrapper integration only.
- `tests/frontend/`: component and helper regression tests.
- `e2e/`: browser workflows for transitions, tilt, mobile fallback, and unchanged analysis.

## Implementation Sequence

1. Add failing pure/component tests for normalization, caps, reset behavior, and celestial direction.
2. Implement the minimum TiltSurface and CelestialTransition behavior required by those tests.
3. Add adaptive theme depth tokens and static reduced-motion behavior.
4. Integrate focused surfaces one group at a time, keeping tests green.
5. Add Playwright flows for real pointer interaction and theme switching.
6. Run desktop and mobile visual QA, including overflow and console checks.
7. Update README documentation and run the complete repository verification command.

## Acceptance Criteria

- All themes exhibit a coherent layered 2.5D hierarchy.
- Light and Dark use calmer depth than Web-Slinger.
- Approved focused surfaces tilt smoothly under a fine desktop pointer.
- Maximum rotation does not exceed six degrees.
- Touch interaction works without orientation permissions.
- Reduced-motion mode contains no continuous or tracking animation.
- Direct Light/Dark changes show the approved sun/moon direction.
- Theme state changes immediately and remains persisted.
- Web-Slinger effects still clear and do not intercept controls.
- Upload, analysis, meeting navigation, warnings, and DOCX download remain fully functional.
- No backend or shared-contract behavior changes.
- Automated and browser verification passes.

## Rejected Alternatives

- Full 3D Command Center: excessive weight and distraction for a document-analysis tool.
- Cinematic portal: separates visual spectacle from the primary workflow and adds loading complexity.
- Every-panel depth: creates competing motion and weakens hierarchy.
- Whole-workspace tilt: moves too much content at once.
- Third-party tilt library: adds dependency cost while reducing theme and accessibility control.
- Gyroscope interaction: requires permissions and can make mobile use unstable.

## Known Risks and Mitigations

- **Nested transforms can blur text:** cap angles, avoid independent text transforms, and verify common display scaling values.
- **Decorations can block controls:** require `pointer-events: none` and cover real clicks in E2E tests.
- **Too many stacking contexts can break overlays:** define a small documented z-index hierarchy and inspect tabs, tooltips, and warning stamps.
- **Motion can distract from analysis:** restrict active tracking to the focused surface and honor reduced motion.
- **Mobile horizontal overflow can regress:** retain explicit browser-width checks and the intentionally scoped navigator scroller.
