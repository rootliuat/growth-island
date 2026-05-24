export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

export function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
