/** Owns exactly one animation-frame loop and caps long frames after a tab resumes. */
export function startGameLoop(update: (elapsedSeconds: number) => void): () => void {
  let previous: number | null = null;
  let frame = 0;
  const tick = (time: number) => {
    const elapsed = previous === null ? 0 : Math.min(0.05, (time - previous) / 1000);
    previous = time;
    update(elapsed);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
