/**
 * Can this browser draw the 3D village? Checked once, before choosing 3D, so devices without
 * WebGL go straight to the 2D village instead of meeting a blank canvas.
 */
let cached: boolean | null = null;

export function webglAvailable(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    cached = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}
