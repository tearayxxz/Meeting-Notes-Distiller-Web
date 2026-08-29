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

  it('returns neutral values for a non-positive rotation cap', () => {
    expect(calculateTilt({ clientX: 100, clientY: 0 }, bounds, -6)).toEqual({
      normalizedX: 0,
      normalizedY: 0,
      rotateX: 0,
      rotateY: 0,
    });
  });
});
