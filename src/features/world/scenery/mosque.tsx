/**
 * The Masjid Courtyard — a shaded arcade, a ribbed teal dome, twin minarets
 * and a working fountain. The composition is deliberately symmetrical around
 * the path, with the fountain offset so the traveller is never hidden.
 */
import { memo } from 'react';
import { ArchWindow, Bird, Crenellations, Door, GrassTuft, GroundShadow, LampPost, Lantern, Palm, PotPlant, Bush, Cypress } from './primitives';

const ARCADE_ARCHES = [-316, -270, -224, -178, 148, 194, 240, 286];

export const MosqueArt = memo(function MosqueArt() {
  return (
    <g className="w-art w-art--mosque">
      <defs>
        <linearGradient id="m-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--wall-light)" />
          <stop offset="0.5" stopColor="var(--wall)" />
          <stop offset="1" stopColor="var(--wall-shade)" />
        </linearGradient>
        <linearGradient id="m-arcade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--wall-shade)" />
          <stop offset="1" stopColor="var(--wall-deep)" />
        </linearGradient>
        <linearGradient id="m-dome" x1="0.16" y1="0" x2="0.84" y2="1">
          <stop offset="0" stopColor="var(--dome-hi)" stopOpacity="0.6" />
          <stop offset="0.26" stopColor="var(--dome)" />
          <stop offset="0.72" stopColor="var(--dome)" />
          <stop offset="1" stopColor="var(--dome-deep)" />
        </linearGradient>
        <linearGradient id="m-dome-rib" x1="0" y1="0" x2="2" y2="1">
          <stop offset="0" stopColor="var(--dome-hi)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--dome-hi)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="m-paving" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--paving-light)" />
          <stop offset="0.55" stopColor="var(--paving)" />
          <stop offset="1" stopColor="var(--paving-deep)" />
        </linearGradient>
        <linearGradient id="m-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--water-hi)" stopOpacity="0.65" />
          <stop offset="0.45" stopColor="var(--water)" />
          <stop offset="1" stopColor="var(--water)" />
        </linearGradient>
        <linearGradient id="m-rug" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--fabric-2)" />
          <stop offset="1" stopColor="var(--emerald-700, #0b5a48)" />
        </linearGradient>
        <pattern id="m-tile" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill="var(--stone)" />
          <path d="M9 1.5 L10.8 7.2 L16.5 9 L10.8 10.8 L9 16.5 L7.2 10.8 L1.5 9 L7.2 7.2Z" fill="none" stroke="var(--gold)" strokeWidth="0.8" opacity="0.65" />
          <circle cx="9" cy="9" r="1.2" fill="var(--turquoise-500)" opacity="0.55" />
        </pattern>
      </defs>

      <GroundShadow rx={372} ry={29} cy={4} opacity={0.8} />

      {/* ── Garden beyond the courtyard ── */}
      <Palm x={-348} s={1.02} delay={0.4} />
      <Palm x={344} s={1.08} delay={1.5} flip />
      <Cypress x={-302} s={0.82} delay={1.1} />
      <Cypress x={300} s={0.78} delay={2.2} />
      <Bush x={-324} s={0.9} delay={0.7} />
      <Bush x={330} s={1} tone={1} delay={1.7} />

      {/* ── Twin minarets, partly hidden by the arcade ── */}
      {[-282, 282].map((x, i) => (
        <g key={x} className="m-minaret" opacity={i ? 0.92 : 1}>
          <rect x={x - 13} y="-300" width="26" height="190" fill="url(#m-wall)" />
          <rect x={x - 15} y="-306" width="30" height="9" rx="2" fill="var(--roof)" />
          <rect x={x - 18} y="-238" width="36" height="7" rx="2" fill="var(--roof-light)" />
          <path d={`M${x - 19} -236 Q${x} -226 ${x + 19} -236 L${x + 14} -226 H${x - 14}Z`} fill="var(--stone-light)" opacity="0.8" />
          <rect x={x - 10} y="-348" width="20" height="44" fill="url(#m-wall)" />
          <path d={`M${x - 17} -348 Q${x} -336 ${x + 17} -348 L${x + 12} -338 H${x - 12}Z`} fill="var(--stone-light)" opacity="0.85" />
          <path d={`M${x - 20} -376 Q${x - 20} -410 ${x} -418 Q${x + 20} -410 ${x + 20} -376Z`} fill="url(#m-dome)" />
          <path d={`M${x} -418 V-434`} stroke="var(--metal)" strokeWidth="2.4" />
          <circle cx={x} cy="-437" r="4" fill="var(--gold)" />
          <ArchWindow x={x - 5} y={-326} w={10} h={18} frame={false} />
          <path d={`M${x - 11} -292 V-252 M${x + 11} -292 V-252`} stroke="var(--stone-light)" strokeWidth="1" opacity="0.4" />
        </g>
      ))}

      {/* ── The arcade wings ── */}
      <g className="m-wings">
        <rect x="-338" y="-148" width="188" height="148" fill="url(#m-arcade)" />
        <rect x="150" y="-148" width="188" height="148" fill="url(#m-arcade)" />
        {ARCADE_ARCHES.map((x) => (
          <g key={x}>
            <path d={`M${x} 0 V-70 Q${x} -104 ${x + 20} -112 Q${x + 40} -104 ${x + 40} -70 V0Z`} fill="var(--door)" opacity="0.92" />
            <path d={`M${x} 0 V-70 Q${x} -104 ${x + 20} -112 Q${x + 40} -104 ${x + 40} -70 V0Z`} fill="none" stroke="var(--stone-light)" strokeWidth="2" opacity="0.55" />
            <path d={`M${x + 6} 0 V-69 Q${x + 6} -96 ${x + 20} -102 Q${x + 34} -96 ${x + 34} -69 V0Z`} fill="var(--wall-deep)" opacity="0.55" />
            <rect x={x + 16} y="-72" width="8" height="72" fill="var(--wall-shade)" opacity="0.6" />
            {x % 2 === 0 ? <Lantern x={x + 20} y={-92} s={0.44} delay={Math.abs(x) * 0.006} /> : null}
          </g>
        ))}
        <rect x="-342" y="-156" width="196" height="12" rx="2" fill="url(#m-wall)" />
        <rect x="146" y="-156" width="196" height="12" rx="2" fill="url(#m-wall)" />
        <Crenellations x={-340} y={-156} w={192} step={22} h={8} />
        <Crenellations x={148} y={-156} w={192} step={22} h={8} />
        <path d="M-338 -148 H-150 M150 -148 H338" stroke="var(--roof-light)" strokeWidth="2" opacity="0.4" />
      </g>

      {/* ── The prayer hall ── */}
      <g className="m-hall">
        <rect x="-154" y="-34" width="308" height="34" fill="var(--stone)" />
        <rect x="-150" y="-252" width="300" height="218" rx="2" fill="url(#m-wall)" />
        <rect x="-158" y="-262" width="316" height="14" rx="2" fill="url(#m-wall)" />
        <path d="M-154 -252 H300" stroke="var(--roof-light)" strokeWidth="2" opacity="0.55" />
        <Crenellations x={-156} y={-262} w={308} step={24} h={7} />

        {/* drum + ribbed dome */}
        <rect x="-86" y="-284" width="172" height="34" rx="2" fill="var(--wall-shade)" />
        <path d="M-124 -280 Q-124 -382 0 -430 Q124 -382 124 -280Z" fill="url(#m-dome)" />
        <path d="M-124 -280 Q-124 -382 0 -430 Q124 -382 124 -280" fill="none" stroke="var(--dome-deep)" strokeWidth="2.5" opacity="0.7" />
        {[-86, -48, -16, 16, 48, 86].map((x) => (
          <path key={x} d={`M${x} -291 Q${x * 0.55} -372 0 -424`} stroke="url(#m-dome-rib)" strokeWidth="2.4" fill="none" opacity="0.45" />
        ))}
        <path d="M-96 -296 Q-78 -382 0 -422" stroke="var(--dome-hi)" strokeWidth="7" fill="none" opacity="0.32" strokeLinecap="round" />
        <path d="M-124 -280 Q0 -264 124 -280" stroke="var(--gold)" strokeWidth="3" fill="none" opacity="0.5" />
        <path d="M0 -428 V-448" stroke="var(--metal)" strokeWidth="4" />
        <path d="M0 -452 Q-6 -459 -1 -463 Q5 -466 6 -458" stroke="var(--gold)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="0" cy="-452" r="3.5" fill="var(--gold)" />

        {/* the portal: tile border, deep arch, warm doors */}
        <path d="M-82 0 V-168 Q-82 -226 0 -244 Q82 -226 82 -168 V0Z" fill="url(#m-tile)" opacity="0.95" />
        <path d="M-72 0 V-166 Q-72 -216 0 -234 Q72 -216 72 -166 V0Z" fill="var(--wall-shade)" />
        <path d="M-72 0 V-166 Q-72 -216 0 -234 Q72 -216 72 -166 V0Z" fill="none" stroke="var(--gold)" strokeWidth="2" opacity="0.6" />
        <Door x={-38} w={76} h={148} />
        <Lantern x={-52} y={-176} s={0.6} delay={0.5} />
        <Lantern x={52} y={-176} s={0.6} delay={1.2} tone="clay" />

        <ArchWindow x={-126} y={-224} w={32} h={62} grille />
        <ArchWindow x={94} y={-224} w={32} h={62} grille />
        <ArchWindow x={-128} y={-118} w={22} h={34} lit={false} />
        <ArchWindow x={106} y={-118} w={22} h={34} />

        {/* limestone bands, a small inscription band and wall lamps */}
        <path d="M-150 -82 H150 M-150 -168 H150" stroke="var(--stone-light)" strokeWidth="2" opacity="0.3" />
        <path d="M-144 -246 H144" stroke="var(--gold)" strokeWidth="2.4" opacity="0.42" strokeDasharray="4 7" />
        <Lantern x={-140} y={-196} s={0.52} delay={1.7} />
        <Lantern x={140} y={-196} s={0.52} delay={0.9} tone="clay" />
      </g>

      {/* ── Courtyard paving, raised above the road ── */}
      <g className="m-court">
        <path d="M-346 0 H346 L338 8 H-338Z" fill="var(--paving-deep)" />
        <path d="M-338 -12 H338 L346 0 H-346Z" fill="url(#m-paving)" />
        <path d="M-338 -12 H338" stroke="var(--paving-light)" strokeWidth="2" opacity="0.55" />
        {[-310, -250, -190, -130, -70, -10, 50, 110, 170, 230, 290].map((x) => (
          <path key={x} d={`M${x} -12 V0`} stroke="var(--paving-deep)" strokeWidth="1.2" opacity="0.5" />
        ))}
        <path d="M-120 -6 H120" stroke="var(--gold)" strokeWidth="1" opacity="0.28" strokeDasharray="3 10" />
        <path d="M0 -9 l5 3 l-5 3 l-5 -3Z" fill="var(--gold)" opacity="0.65" />
        <path d="M-34 -8 l4 2 l-4 2 l-4 -2Z M34 -8 l4 2 l-4 2 l-4 -2Z" fill="var(--turquoise-500)" opacity="0.5" />
      </g>

      {/* ── The fountain, offset left so the path stays clear ── */}
      <g className="m-fountain" transform="translate(-206 0)">
        <GroundShadow rx={86} ry={13} cy={2} />
        <ellipse cx="0" cy="-2" rx="72" ry="20" fill="var(--stone)" />
        <ellipse cx="0" cy="-8" rx="64" ry="17" fill="var(--paving-light)" />
        <ellipse cx="0" cy="-10" rx="55" ry="13" fill="url(#m-water)" />
        <ellipse className="w-shimmer" cx="-14" cy="-13" rx="24" ry="4" fill="var(--water-hi)" opacity="0.4" />
        <ellipse cx="15" cy="-7" rx="17" ry="3" fill="var(--water-hi)" opacity="0.16" />
        <rect x="-8" y="-64" width="16" height="54" rx="4" fill="var(--stone-light)" />
        <path d="M-30 -62 H30 L24 -52 H-24Z" fill="var(--stone-light)" />
        <ellipse cx="0" cy="-66" rx="30" ry="9" fill="var(--paving)" />
        <ellipse cx="0" cy="-68" rx="24" ry="6.5" fill="url(#m-water)" />
        <path d="M-24 -68 Q-18 -82 -6 -88 M24 -68 Q18 -82 6 -88" className="w-spout" stroke="var(--water-hi)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M-4 -88 H4 L3 -82 H-3Z" fill="var(--gold)" />
        <PathSpouts />
        <PotPlant x={-76} s={0.65} flower />
        <PotPlant x={76} s={0.6} />
      </g>

      {/* ── Courtyard details ── */}
      <g className="m-rug" transform="translate(196 -3)">
        <path d="M-46 0 L-40 -34 L40 -34 L46 0Z" fill="url(#m-rug)" opacity="0.92" />
        <path d="M-38 -4 L-33 -29 L33 -29 L38 -4Z" fill="none" stroke="var(--gold-soft)" strokeWidth="1.4" opacity="0.55" />
        <path d="M-20 -29 L-14 -4 M0 -29 V-4 M20 -29 L14 -4" stroke="var(--gold)" strokeWidth="0.8" opacity="0.4" />
        <path d="M-10 -18 l5 3 l-5 3 l-5 -3Z M10 -18 l5 3 l-5 3 l-5 -3Z" fill="var(--gold-soft)" opacity="0.4" />
      </g>

      <LampPost x={-128} h={96} delay={0.3} />
      <LampPost x={128} h={96} delay={1.4} />
      <PotPlant x={-166} s={0.95} flower />
      <PotPlant x={166} s={0.9} />
      <PotPlant x={136} s={0.7} flower />
      {[-336, -316, -154, 152, 320].map((x, i) => (
        <GrassTuft key={x} x={x} s={0.65 + (i % 3) * 0.15} delay={i * 0.5} />
      ))}

      <Bird x={-44} y={-462} s={0.8} delay={0.4} />
      <Bird x={-18} y={-474} s={0.6} delay={1.1} />
      <Bird x={26} y={-456} s={0.7} delay={1.8} />
    </g>
  );
});

/** Two extra arcing jets that make the fountain read from a distance. */
function PathSpouts() {
  return (
    <g className="w-spout-soft" opacity="0.55">
      <path d="M-22 -66 Q-34 -92 -44 -72" stroke="var(--water-hi)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeDasharray="4 5" />
      <path d="M22 -66 Q34 -92 44 -72" stroke="var(--water-hi)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeDasharray="4 5" />
    </g>
  );
}
