# SAJA — Performance Report

**Measurements below:** reproduced only in the prior Claude local environment; no independent timing or real-device measurements in this handoff. Keep hardware, network profiles and test commit with every future measurement.

## Reported results

| Metric | Previous observation | Caveat |
|---|---:|---|
| Initial app visit transfer | 308 KB | Local production build; exact cache state needs documentation |
| Return home transfer | 29 KB | Prior agent estimate |
| Entering 3D village transfer | 1.79 MB | Includes lazily fetched dependencies/assets |
| 3D ready wait on localhost | ~3.1 sec | GPU compilation/parse dominated |
| Explore-to-ready, 4G-like profile, without prefetch | 4.95 sec | Simulated profile |
| Explore-to-ready with scene prefetch | 3.33 sec | ~33% shorter after click; total bytes not necessarily less |
| Village GLB | ~3 MB raw / ~718 KB gzip | Reported 80k tris, 259 meshes, ~264 draw calls |
| 3D JavaScript chunk | ~3.27 MB raw / ~1.12 MB gzip earlier | Rapier WASM base64 + Three.js, lazy loaded |
| Headless Chrome software renderer | ~2–5 FPS | **Not representative of physical GPU performance** |

## Recommended performance work

1. Measure real GPU p50/p95 frame time, input latency, FPS, and memory on desktop/mobile.
2. Profile draw calls, transparent materials, shadows and texture VRAM; identify bottlenecks before mesh merging.
3. Evaluate mesh/texture compression with animation integrity checks and cache-key consistency.
4. Keep lazy loading, early prefetch on navigation intent, and low-GPU 2D fallback.
5. Avoid a Vite alias replacing `@dimforge/rapier3d-compat` with incompatible `@dimforge/rapier3d`.
6. Test cache hit/miss, CPU, memory and loading on slow 4G and 3G-latency profiles. Prefer user-perceived ready time over total HTML download alone.

## Performance acceptance

No universal FPS claim is made. Choose device classes, measurable targets and degradation behavior before public launch. Record build SHA and profiler evidence; if a target fails, either optimize or ship the 2D fallback as the default for that class.
