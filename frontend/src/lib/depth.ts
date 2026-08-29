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
    rotateX: normalizedY === 0 ? 0 : -normalizedY * maxRotation,
    rotateY: normalizedX * maxRotation,
  };
}
