/**
 * The rest of the world's landmarks. They share the village/mosque vocabulary
 * so the journey never feels like a set of unrelated illustrations: the same
 * arches, brass lanterns, stone bases and planting appear in every scene.
 */
import { memo, type CSSProperties } from 'react';
import { ArchWindow, Bird, Bush, Crate, GrassTuft, GroundShadow, Jar, LampPost, Lantern, OliveTree, Palm, PotPlant, RoundTree } from './primitives';

export const GardenArt = memo(function GardenArt() {
  return (
    <g className="w-art w-art--garden">
      <GroundShadow rx={318} ry={26} cy={4} opacity={0.7} />
      <RoundTree x={-252} s={1.12} delay={0.3} />
      <RoundTree x={218} s={1.2} tone={1} delay={1.4} />
      <RoundTree x={340} s={0.78} delay={2.1} />
      <Bush x={-148} s={0.9} delay={0.4} />
      <Bush x={120} s={0.8} tone={1} delay={1.8} />

      {/* the arch of growth */}
      <g className="w-growth-arch">
        <path d="M-76 0 V-150 C-76 -208 -42 -236 0 -266 C42 -236 76 -208 76 -150 V0" fill="none" stroke="var(--gold)" strokeWidth="7" opacity="0.8" />
        <path d="M-62 0 V-146 C-62 -198 -34 -222 0 -248 C34 -222 62 -198 62 -146 V0" fill="none" stroke="var(--foliage)" strokeWidth="12" strokeDasharray="16 10" />
        <path d="M-54 -60 Q-26 -52 0 -60 Q28 -52 54 -60 M-50 -128 Q-24 -118 0 -128 Q26 -118 50 -128" stroke="var(--foliage-dark)" strokeWidth="3" fill="none" strokeDasharray="2 9" />
        {[-50, -30, -8, 14, 36].map((x, i) => (
          <circle key={x} cx={x} cy={-116 - (i % 2) * 44} r="5" fill={i % 3 === 0 ? 'var(--flower-a)' : i % 3 === 1 ? 'var(--flower-b)' : 'var(--flower-c)'} />
        ))}
      </g>

      {/* flower beds in loose perspective rows */}
      {Array.from({ length: 23 }, (_, i) => {
        const row = i % 3;
        const x = -326 + i * 29;
        const y = -2 - row * 7;
        return (
          <g key={i}>
            <path d={`M${x} ${y} q2 -12 0 -17`} stroke="var(--foliage-dark)" strokeWidth="2" fill="none" opacity="0.8" />
            <circle cx={x} cy={y - 19} r={3.4 + (i % 3)} fill={i % 4 === 0 ? 'var(--flower-a)' : i % 4 === 1 ? 'var(--flower-b)' : i % 4 === 2 ? 'var(--flower-c)' : 'var(--gold)'} />
          </g>
        );
      })}
      {[-306, -188, 104, 286].map((x, i) => (
        <GrassTuft key={x} x={x} s={0.9 + (i % 2) * 0.2} delay={i * 0.6} />
      ))}
      <LampPost x={-132} h={88} delay={0.7} />
      <LampPost x={132} h={88} delay={1.5} />
      <Lantern x={-170} y={-56} s={0.7} delay={0.2} tone="clay" />
      <Bird x={-16} y={-296} s={0.7} delay={0.4} />
    </g>
  );
});

export const LibraryArt = memo(function LibraryArt() {
  return (
    <g className="w-art w-art--library">
      <defs>
        <linearGradient id="l-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--wall-light)" />
          <stop offset="1" stopColor="var(--wall-shade)" />
        </linearGradient>
      </defs>
      <GroundShadow rx={262} ry={24} cy={4} opacity={0.75} />
      <Palm x={-242} s={0.86} delay={0.6} />
      <Palm x={240} s={0.9} delay={1.7} flip />
      <rect x="-178" y="-34" width="356" height="34" fill="var(--stone)" />
      <rect x="-170" y="-400" width="340" height="366" fill="url(#l-wall)" />
      <rect x="-182" y="-412" width="364" height="18" rx="4" fill="var(--wall-shade)" />
      <path d="M-176 -400 H176" stroke="var(--roof-light)" strokeWidth="2" opacity="0.45" />
      {[-120, 0, 120].map((x) => (
        <g key={x}>
          <path d={`M${x - 28} -412 Q${x - 28} -468 ${x} -482 Q${x + 28} -468 ${x + 28} -412Z`} fill="var(--dome)" />
          <path d={`M${x} -482 V-494`} stroke="var(--metal)" strokeWidth="2.4" />
          <circle cx={x} cy="-497" r="3.5" fill="var(--gold)" />
          <path d={`M${x - 14} -418 Q${x - 4} -462 ${x} -474`} stroke="var(--dome-hi)" strokeWidth="3" fill="none" opacity="0.35" />
        </g>
      ))}
      {[-134, -62, 32, 104].map((x) =>
        [-372, -260].map((y) => <ArchWindow key={`${x}${y}`} x={x} y={y} w={30} h={64} />),
      )}
      <path d="M-60 0 V-110 Q-60 -174 0 -190 Q60 -174 60 -110 V0Z" fill="var(--wall-shade)" />
      <path d="M-50 0 V-106 Q-50 -160 0 -176 Q50 -160 50 -106 V0Z" className="w-window" />
      <path d="M-50 0 V-106 Q-50 -160 0 -176 Q50 -160 50 -106 V0Z" fill="none" stroke="var(--gold)" strokeWidth="2" opacity="0.65" />
      <path d="M-64 0 H64 V8 H-64Z" fill="var(--stone-light)" opacity="0.7" />
      <g className="w-pages">
        {[
          [-236, -302, 0],
          [216, -338, 0.9],
          [-204, -182, 1.8],
          [246, -204, 2.7],
          [-252, -410, 1.2],
        ].map(([x, y, d], i) => (
          <g key={i} transform={`translate(${x} ${y})`} style={{ animationDelay: `${d}s` }}>
            <path d="M0 0 l15 -7 l15 7 l-15 7Z" fill="var(--gold-soft)" />
            <path d="M0 0 l15 7 l15 -7" stroke="var(--gold)" strokeWidth="0.8" fill="none" opacity="0.6" />
          </g>
        ))}
      </g>
      <LampPost x={-112} h={104} delay={0.9} />
      <LampPost x={112} h={104} delay={1.8} />
      <PotPlant x={-152} s={0.8} flower />
      <PotPlant x={150} s={0.75} />
    </g>
  );
});

export const HouseArt = memo(function HouseArt() {
  return (
    <g className="w-art w-art--house">
      <defs>
        <linearGradient id="h-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--wall-light)" />
          <stop offset="1" stopColor="var(--wall)" />
        </linearGradient>
      </defs>
      <GroundShadow rx={286} ry={24} cy={4} opacity={0.75} />
      <rect x="-196" y="-44" width="392" height="44" fill="var(--stone)" />
      <rect x="-176" y="-272" width="352" height="228" fill="url(#h-wall)" />
      <rect x="-192" y="-288" width="384" height="24" rx="4" fill="var(--wall-shade)" />
      <CrenellationsX />
      {[-150, -75, 0, 75, 150].map((x) => (
        <g key={x}>
          <rect x={x - 13} y="-262" width="26" height="218" rx="4" fill="var(--pillar)" />
          <rect x={x - 17} y="-266" width="34" height="11" rx="3" fill="var(--wall-shade)" />
          <path d={`M${x - 9} -246 V-38`} stroke="var(--wall-light)" strokeWidth="1.2" opacity="0.35" />
        </g>
      ))}
      {[-112, -37, 38, 113].map((x) => (
        <path key={x} d={`M${x - 26} -44 V-154 Q${x - 26} -206 ${x} -218 Q${x + 26} -206 ${x + 26} -154 V-44Z`} className="w-arch" />
      ))}
      {[-112, 38].map((x) => <Lantern key={x} x={x} y={-154} s={0.72} delay={Math.abs(x) * 0.01} />)}
      <Lantern x={113} y={-154} s={0.6} delay={1.2} tone="clay" />
      <RoundTree x={268} s={0.86} tone={1} delay={0.8} />
      <Bush x={-250} s={0.8} delay={1.9} />
      <PotPlant x={-212} s={0.9} flower />
      <Jar x={214} s={0.8} />
      <GrassTuft x={-276} s={0.9} delay={0.4} />
    </g>
  );
});

function CrenellationsX() {
  return (
    <g fill="var(--roof-deep)">
      {[-182, -150, -118, -86, -54, -22, 10, 42, 74, 106, 138, 170].map((x) => (
        <rect key={x} x={x} y="-298" width="13" height="10" rx="2" />
      ))}
    </g>
  );
}

export const MarketArt = memo(function MarketArt() {
  return (
    <g className="w-art w-art--market">
      <GroundShadow rx={326} ry={26} cy={4} opacity={0.72} />
      {[
        [-254, 'var(--awning-a)'],
        [-46, 'var(--awning-b)'],
        [162, 'var(--awning-c)'],
      ].map(([x, c], i) => (
        <g key={x as number} transform={`translate(${x} 0)`}>
          <GroundShadow rx={62} ry={10} cy={2} />
          <rect x="-4" y="-170" width="8" height="170" fill="var(--wood)" />
          <rect x="136" y="-170" width="8" height="170" fill="var(--wood)" />
          <path d="M-22 -170 L70 -224 L162 -170Z" fill={c as string} />
          <path d="M-22 -170 q15 18 30 0 q15 18 30 0 q15 18 30 0 q15 18 30 0 q15 18 30 0 q15 18 30 0" fill={c as string} />
          <path d="M-22 -170 L70 -224 L162 -170" fill="none" stroke="var(--gold-soft)" strokeWidth="1.4" opacity="0.35" />
          <rect x="0" y="-80" width="140" height="16" rx="4" fill="var(--wood-light)" />
          <rect x="0" y="-66" width="140" height="4" rx="2" fill="var(--wood)" opacity="0.7" />
          <circle cx="30" cy="-92" r="12" fill="var(--flower-b)" />
          <circle cx="58" cy="-90" r="10" fill="var(--gold)" />
          <circle cx="92" cy="-92" r="12" fill="var(--flower-a)" />
          <rect x="112" y="-106" width="18" height="26" rx="4" fill="var(--wall)" />
          {i === 1 ? <Lantern x={70} y={-232} s={0.55} delay={0.6} /> : null}
          {i === 2 ? <PotPlant x={150} s={0.8} flower /> : null}
        </g>
      ))}
      <path d="M-286 -256 Q-40 -186 348 -256" stroke="var(--metal)" strokeWidth="1.8" fill="none" opacity="0.7" />
      {[-228, -146, -64, 18, 100, 182, 264].map((x, i) => {
        const y = -256 + 80 * Math.sin(((x + 286) / 634) * Math.PI) * 0.55;
        return <Lantern key={x} x={x} y={y + 12} s={0.44 + (i % 3) * 0.06} delay={i * 0.5} tone={i % 2 ? 'clay' : 'brass'} />;
      })}
      <Crate x={-306} s={0.8} />
      <Jar x={-288} s={0.9} tall />
      <Crate x={332} s={0.7} />
      <Jar x={320} s={0.8} />
      <GrassTuft x={-320} s={0.8} delay={0.4} />
      <GrassTuft x={344} s={0.8} delay={1.1} />
    </g>
  );
});

export const ReflectionArt = memo(function ReflectionArt() {
  return (
    <g className="w-art w-art--reflection">
      <GroundShadow rx={324} ry={26} cy={4} opacity={0.7} />
      <g transform="translate(0 -18) scale(0.86 0.7)">
        <ellipse cx="0" cy="0" rx="270" ry="48" fill="var(--wall-shade)" opacity="0.55" />
        <ellipse cx="0" cy="-4" rx="248" ry="37" className="w-water" />
        <ellipse cx="-64" cy="-8" rx="72" ry="6" fill="var(--water-hi)" opacity="0.35" className="w-shimmer" />
        <ellipse cx="62" cy="1" rx="48" ry="4" fill="var(--water-hi)" opacity="0.14" />
        <path d="M0 -40 l10 18 l20 -4 l-8 18 l14 14 l-20 2 l-6 20 l-10 -16 l-10 16 l-6 -20 l-20 -2 l14 -14 l-8 -18 l20 4Z" transform="translate(0 34) scale(0.9 0.3)" fill="none" stroke="var(--gold)" strokeWidth="3" opacity="0.55" />
      </g>
      <Palm x={-238} s={0.98} delay={0.4} />
      <Palm x={244} s={0.9} delay={1.6} flip />
      <g transform="translate(-176 0)">
        <g className="w-sway" style={{ '--sway-delay': '0.9s', '--sway-duration': '10s' } as CSSProperties}>
          <path d="M0 0 Q-4 -92 12 -184" stroke="var(--trunk)" strokeWidth="11" fill="none" strokeLinecap="round" />
          {[-64, -32, 0, 32, 64].map((dx, i) => (
            <path key={i} d={`M12 -184 Q${12 + dx} -172 ${12 + dx * 1.7} -56`} stroke={i % 2 ? 'var(--foliage)' : 'var(--foliage-dark)'} strokeWidth={10 - Math.abs(dx) / 12} fill="none" strokeLinecap="round" opacity="0.9" />
          ))}
          <circle cx="12" cy="-190" r="48" fill="var(--foliage-dark)" />
          <circle cx="-8" cy="-202" r="22" fill="var(--foliage)" opacity="0.65" />
        </g>
      </g>
      <g transform="translate(196 -4)">
        <GroundShadow rx={48} ry={7} />
        <rect x="-52" y="-30" width="104" height="10" rx="4" fill="var(--wood)" />
        <rect x="-47" y="-20" width="8" height="20" fill="var(--wood)" />
        <rect x="39" y="-20" width="8" height="20" fill="var(--wood)" />
        <path d="M-52 -30 Q0 -40 52 -30" stroke="var(--wood-light)" strokeWidth="2" fill="none" opacity="0.6" />
      </g>
      {[-300, -272, 272, 300].map((x, i) => (
        <ellipse key={x} cx={x} cy={i % 2 ? -4 : -8} rx="18" ry="6" fill="var(--wall)" opacity="0.65" />
      ))}
      {[-318, -282, 284, 320].map((x, i) => (
        <GrassTuft key={x} x={x} s={0.8 + (i % 2) * 0.2} delay={i * 0.7} />
      ))}
      <Lantern x={-316} y={-56} s={0.58} delay={0.2} tone="clay" />
      <Lantern x={316} y={-56} s={0.58} delay={1.1} />
    </g>
  );
});

export const DesertArt = memo(function DesertArt() {
  return (
    <g className="w-art w-art--desert">
      <path d="M-360 0 Q-200 -118 -40 -34 Q120 -150 360 0Z" fill="var(--sand)" />
      <path d="M-360 0 Q-200 -78 -60 -12 Q100 -88 360 0Z" fill="var(--sand-shade)" />
      <path d="M-360 -2 Q-230 -18 -150 0 M60 -6 Q190 -22 356 -2" stroke="var(--sand)" strokeWidth="3" fill="none" opacity="0.45" />
      <g transform="translate(-138 -30)">
        <GroundShadow rx={92} ry={11} />
        <path d="M-94 34 L0 -122 L94 34Z" fill="var(--awning-a)" />
        <path d="M0 -122 L-32 34 H32Z" fill="var(--door)" />
        <path d="M0 -122 V-142" stroke="var(--metal)" strokeWidth="3" />
        <path d="M-94 34 L0 -122 L94 34" fill="none" stroke="var(--gold)" strokeWidth="2" opacity="0.35" />
        <path d="M-12 34 V-42 Q-12 -68 0 -74 Q12 -68 12 -42 V34Z" fill="var(--wood)" />
        <Lantern x={0} y={-78} s={0.7} delay={0.4} />
      </g>
      <g transform="translate(128 -40)">
        <GroundShadow rx={70} ry={9} />
        <path d="M-72 40 L0 -86 L72 40Z" fill="var(--awning-c)" />
        <path d="M0 -86 L-22 40 H22Z" fill="var(--door)" />
        <path d="M-72 40 L0 -86 L72 40" fill="none" stroke="var(--gold)" strokeWidth="2" opacity="0.3" />
        <Lantern x={26} y={-40} s={0.52} delay={1.1} tone="clay" />
      </g>
      <Palm x={-300} s={1.1} delay={0.2} />
      <Palm x={292} s={0.92} delay={1.3} flip />
      <g className="w-caravan" opacity="0.85">
        {[0, 46, 92].map((dx, i) => (
          <g key={dx} transform={`translate(${190 + dx} -6) scale(${0.75 - i * 0.06})`}>
            <path d="M-16 0 Q-20 -18 -10 -28 Q0 -34 10 -26 Q20 -18 16 0 M-10 0 V-14 M10 0 V-14" stroke="var(--sand-shade)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M-10 -28 Q-14 -38 -6 -40 Q-2 -34 -6 -28" fill="var(--sand-shade)" />
          </g>
        ))}
      </g>
      <Lantern x={20} y={-66} s={0.62} delay={0.9} />
    </g>
  );
});

export const MountainArt = memo(function MountainArt() {
  return (
    <g className="w-art w-art--mountain">
      <defs>
        <linearGradient id="mt-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--wall-light)" />
          <stop offset="1" stopColor="var(--wall)" />
        </linearGradient>
      </defs>
      <path d="M-440 0 L-150 -484 Q-86 -556 -22 -536 L42 -578 Q104 -610 158 -536 L440 0Z" fill="var(--hill-far)" />
      <path d="M-440 0 L-150 -484 Q-112 -516 -70 -484 L-214 0Z" fill="var(--wall-shade)" opacity="0.32" />
      <path d="M-160 -42 L62 -146 L-84 -258 L94 -372 L22 -486" stroke="var(--path-soft)" strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray="2 15" />
      <path d="M158 -536 Q210 -570 260 -552 L440 0 H160Z" fill="var(--hill-mid)" opacity="0.55" />
      <g transform="translate(44 -578)">
        <GroundShadow rx={70} ry={9} />
        <rect x="-64" y="-12" width="128" height="54" rx="2" fill="url(#mt-wall)" />
        <path d="M-64 -12 Q-64 -94 0 -102 Q64 -94 64 -12Z" fill="var(--dome)" />
        <path d="M-10 -100 L10 -100 L12 -12 L-12 -12Z" className="w-window" />
        <path d="M-6 -98 V-14 M6 -98 V-14" stroke="var(--metal)" strokeWidth="1.4" opacity="0.6" />
        <ArchWindow x={-48} y={2} w={18} h={30} />
        <ArchWindow x={30} y={2} w={18} h={30} />
        <path d="M0 -102 V-116" stroke="var(--metal)" strokeWidth="2" />
        <circle cx="0" cy="-119" r="3" fill="var(--gold)" />
      </g>
      <g transform="translate(-98 -8)">
        <GroundShadow rx={36} ry={6} />
        <rect x="-2" y="-64" width="4" height="64" fill="var(--metal)" />
        <path d="M-18 -58 L4 -70 L22 -50" stroke="var(--metal-light)" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="4" cy="-70" r="5" fill="var(--stone-light)" />
        <circle cx="4" cy="-70" r="2.4" fill="var(--water-hi)" opacity="0.7" />
      </g>
      <Palm x={-330} s={0.72} delay={0.6} />
      <GrassTuft x={-240} s={0.9} delay={0.4} />
      <GrassTuft x={290} s={0.8} delay={1.2} />
      <Bird x={-180} y={-500} s={0.7} delay={0.2} />
      <Bird x={-142} y={-516} s={0.55} delay={1.4} />
      <Lantern x={-30} y={-210} s={0.55} delay={1} tone="clay" />
      <OliveTree x={-214} s={0.6} delay={2.1} />
    </g>
  );
});
