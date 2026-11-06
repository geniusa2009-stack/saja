/**
 * The Village — a warm cluster of stone houses, a working well, a market
 * awning and lanterns strung between neighbours. Built in three depth planes
 * (back lane, street front, foreground props) so the camera always has
 * something to reveal as it follows the path.
 */
import { memo } from 'react';
import { ArchWindow, Crenellations, Crate, Cypress, Door, GrassTuft, GroundShadow, Jar, LampPost, Lantern, OliveTree, Palm, PotPlant, StringLights } from './primitives';

export const VillageArt = memo(function VillageArt() {
  return (
    <g className="w-art w-art--village">
      <defs>
        <linearGradient id="v-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--wall-light)" />
          <stop offset="0.55" stopColor="var(--wall)" />
          <stop offset="1" stopColor="var(--wall-shade)" />
        </linearGradient>
        <linearGradient id="v-wall-warm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--wall-warm)" />
          <stop offset="1" stopColor="var(--wall-shade)" />
        </linearGradient>
        <linearGradient id="v-roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--roof-light)" />
          <stop offset="1" stopColor="var(--roof-deep)" />
        </linearGradient>
        <linearGradient id="v-dome" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="var(--dome-hi)" stopOpacity="0.55" />
          <stop offset="0.32" stopColor="var(--dome)" />
          <stop offset="1" stopColor="var(--dome-deep)" />
        </linearGradient>
        <linearGradient id="v-awning" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--awning-a)" />
          <stop offset="1" stopColor="var(--awning-c)" />
        </linearGradient>
        <linearGradient id="v-rug" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--fabric)" />
          <stop offset="1" stopColor="var(--fabric-2)" />
        </linearGradient>
      </defs>

      <GroundShadow rx={305} ry={26} cy={4} opacity={0.75} />

      {/* ── Back lane: silhouettes that make the street feel inhabited ── */}
      <Palm x={-292} s={1.02} delay={0.2} />
      <OliveTree x={-238} s={0.78} delay={1.4} />
      <Palm x={306} s={0.94} delay={1.1} flip />

      <g className="v-back-house" opacity="0.82">
        <rect x="-266" y="-112" width="122" height="112" rx="3" fill="var(--wall-shade)" />
        <rect x="-272" y="-118" width="134" height="10" rx="2.5" fill="var(--roof-deep)" />
        <ArchWindow x={-246} y={-92} w={20} h={32} lit={false} frame={false} />
        <ArchWindow x={-204} y={-92} w={20} h={32} />
        <path d="M-188 0 V-58 Q-188 -72 -176 -74 Q-164 -72 -164 -58 V0Z" fill="var(--door)" />
        <path d="M-252 0 H-148" stroke="var(--stone-light)" strokeWidth="5" opacity="0.4" />
      </g>

      {/* ── Street front: the two-storey house ── */}
      <g className="v-main-house">
        <rect x="-124" y="-36" width="158" height="36" fill="var(--stone)" />
        <rect x="-120" y="-214" width="150" height="180" rx="2" fill="url(#v-wall)" />
        <rect x="24" y="-190" width="26" height="156" fill="var(--wall-shade)" />
        <rect x="18" y="-202" width="36" height="14" rx="2" fill="var(--roof)" />
        <rect x="-128" y="-224" width="158" height="14" rx="2.5" fill="url(#v-roof)" />
        <Crenellations x={-126} y={-224} w={152} step={20} h={8} />
        <path d="M-128 -210 H30" stroke="var(--roof-light)" strokeWidth="2" opacity="0.5" />

        {/* plaster bands and a little stone base */}
        <path d="M-120 -66 H30 M-120 -132 H30" stroke="var(--wall-shade)" strokeWidth="2" opacity="0.55" />
        <path d="M-120 -40 H30" stroke="var(--stone-light)" strokeWidth="4" opacity="0.35" />
        {[-104, -76, -48, -20, 8].map((x) => (
          <path key={x} d={`M${x} -34 V-6`} stroke="var(--stone-light)" strokeWidth="1.2" opacity="0.28" />
        ))}

        <ArchWindow x={-100} y={-192} w={26} h={42} />
        <ArchWindow x={-58} y={-192} w={26} h={42} />
        <ArchWindow x={-18} y={-188} w={20} h={34} lit={false} />

        {/* wooden balcony with a shaded underside */}
        <rect x="-80" y="-150" width="88" height="7" rx="2" fill="var(--wood)" />
        <rect x="-80" y="-143" width="88" height="3" fill="var(--wood-light)" opacity="0.4" />
        {[-76, -58, -40, -22, -4].map((x) => (
          <rect key={x} x={x} y="-176" width="2.4" height="27" rx="1" fill="var(--wood)" />
        ))}
        <path d="M-80 -176 H8" stroke="var(--wood-light)" strokeWidth="3" strokeLinecap="round" />
        <path d="M-72 -143 L-78 -122 M0 -143 L6 -124" stroke="var(--wood)" strokeWidth="4" strokeLinecap="round" />
        <path d="M-68 -146 Q-72 -170 -68 -178 M-8 -146 Q-4 -170 -8 -178" stroke="var(--fabric)" strokeWidth="1.4" fill="none" opacity="0.6" />
        <Lantern x={-36} y={-132} s={0.62} delay={0.4} />

        {/* a rug airing over the balcony rail */}
        <path d="M-62 -146 H-28 L-31 -112 Q-45 -108 -59 -112Z" fill="url(#v-rug)" opacity="0.92" />
        <path d="M-58 -140 V-116 M-52 -140 V-114 M-46 -140 V-113 M-40 -140 V-114" stroke="var(--gold-soft)" strokeWidth="1.4" opacity="0.55" />
        <path d="M-62 -146 H-28" stroke="var(--gold)" strokeWidth="1.4" opacity="0.7" />

        <Door x={-90} w={54} h={96} />
        <ArchWindow x={-22} y={-104} w={24} h={38} />

        {/* flower box + a small wall lamp */}
        <rect x="-102" y="-146" width="30" height="7" rx="2" fill="var(--pot)" />
        <circle cx="-94" cy="-150" r="4" fill="var(--flower-a)" />
        <circle cx="-85" cy="-152" r="3.4" fill="var(--flower-b)" />
        <circle cx="-77" cy="-149" r="3.8" fill="var(--flower-c)" />
        <path d="M-100 -146 Q-96 -154 -93 -147 M-86 -146 Q-84 -156 -80 -147" stroke="var(--foliage)" strokeWidth="1.6" fill="none" />
        <Lantern x={8} y={-188} s={0.52} delay={1.1} tone="clay" />
      </g>

      {/* ── Street front: neighbour's house ── */}
      <g className="v-side-house">
        <rect x="78" y="-28" width="112" height="28" fill="var(--stone)" opacity="0.8" />
        <rect x="82" y="-160" width="104" height="132" rx="2" fill="url(#v-wall-warm)" />
        <rect x="76" y="-168" width="116" height="11" rx="2" fill="url(#v-roof)" />
        <Crenellations x={80} y={-168} w={106} step={19} h={7} />
        <ArchWindow x={100} y={-138} w={22} h={36} />
        <ArchWindow x={144} y={-138} w={22} h={36} lit={false} />
        <path d="M110 0 V-74 Q110 -96 130 -98 Q150 -96 150 -74 V0Z" fill="var(--door)" />
        <path d="M110 0 V-74 Q110 -96 130 -98 Q150 -96 150 -74 V0Z" fill="none" stroke="var(--wood-light)" strokeWidth="1.8" opacity="0.7" />
        <path d="M130 0 V-92" stroke="var(--wood)" strokeWidth="1.2" opacity="0.8" />
        <circle cx="120" cy="-46" r="1.7" fill="var(--gold)" />
        <circle cx="140" cy="-46" r="1.7" fill="var(--gold)" />
        <path d="M104 -96 Q130 -82 156 -96 L152 -108 H108Z" fill="url(#v-awning)" opacity="0.9" />
        <path d="M108 -108 H152" stroke="var(--metal)" strokeWidth="2" />
        <rect x="86" y="-66" width="24" height="18" rx="2" fill="var(--wood)" opacity="0.7" />
        <rect x="90" y="-62" width="16" height="3" rx="1.5" fill="var(--wood-light)" opacity="0.5" />
        <rect x="86" y="-48" width="24" height="18" rx="2" fill="var(--wood)" opacity="0.55" />
        <Lantern x={170} y={-126} s={0.55} delay={0.8} />
      </g>

      {/* ── Market awning at the right, where Amina greets travellers ── */}
      <g className="v-market">
        <GroundShadow rx={62} ry={9} cy={2} />
        <rect x="204" y="-126" width="5" height="126" fill="var(--wood)" />
        <rect x="302" y="-126" width="5" height="126" fill="var(--wood)" />
        <path d="M194 -112 L310 -112 L318 -132 L202 -132Z" fill="url(#v-awning)" />
        <path d="M202 -132 H318" stroke="var(--gold-soft)" strokeWidth="2" opacity="0.5" />
        {[210, 232, 254, 276, 298].map((x) => (
          <path key={x} d={`M${x} -132 L${x + 4} -112`} stroke="var(--gold-soft)" strokeWidth="1" opacity="0.3" />
        ))}
        <path d="M198 -112 q14 16 28 0 q14 16 28 0 q14 16 28 0 q14 16 28 0 q14 16 28 0" fill="var(--awning-a)" opacity="0.95" />
        <rect x="210" y="-64" width="92" height="8" rx="2" fill="var(--wood-light)" />
        <rect x="214" y="-56" width="5" height="56" fill="var(--wood)" />
        <rect x="292" y="-56" width="5" height="56" fill="var(--wood)" />
        <Jar x={226} s={0.85} />
        <Jar x={246} s={1} tall />
        <circle cx="267" cy="-70" r="6" fill="var(--flower-a)" />
        <circle cx="280" cy="-70" r="5" fill="var(--gold)" />
        <circle cx="270" cy="-64" r="5" fill="var(--flower-c)" />
        <Crate x={305} s={0.8} />
        <Lantern x={292} y={-138} s={0.62} delay={1.5} />
      </g>

      {/* ── The well: a small architectural anchor on the left ── */}
      <g className="v-well">
        <GroundShadow rx={52} ry={9} cy={2} />
        <ellipse cx="0" cy="-4" rx="42" ry="13" fill="var(--stone)" />
        <ellipse cx="0" cy="-10" rx="36" ry="10" fill="var(--paving-light)" />
        <ellipse cx="0" cy="-11" rx="30" ry="7.5" fill="var(--water)" />
        <ellipse cx="-7" cy="-13" rx="13" ry="3" fill="var(--water-hi)" opacity="0.35" />
        <path d="M-42 -12 V-34 Q-42 -44 -34 -48 H34 Q42 -44 42 -34 V-12" fill="var(--stone-light)" />
        <path d="M-42 -34 Q0 -24 42 -34" stroke="var(--stone)" strokeWidth="6" fill="none" />
        <rect x="-38" y="-112" width="5" height="72" fill="var(--wood)" />
        <rect x="34" y="-112" width="5" height="72" fill="var(--wood)" />
        <path d="M-42 -110 H44 L36 -122 H-34Z" fill="var(--wood-light)" />
        <path d="M-38 -112 Q0 -96 38 -112" stroke="var(--metal)" strokeWidth="2" fill="none" />
        <path d="M0 -101 V-54" stroke="var(--metal)" strokeWidth="1.4" />
        <path d="M-9 -54 H9 L7 -38 Q0 -34 -7 -38Z" fill="var(--wood)" />
        <path d="M-9 -54 H9" stroke="var(--metal)" strokeWidth="2" />
        <Lantern x={-42} y={-72} s={0.5} delay={0.6} tone="clay" />
        <PotPlant x={-58} s={0.7} flower />
      </g>

      <StringLights x1={-112} y1={-206} x2={68} y2={-170} sag={38} count={4} delay={0.2} />
      <StringLights x1={68} y1={-170} x2={224} y2={-140} sag={28} count={3} delay={1.3} />

      {/* ── Foreground dressing ── */}
      <PotPlant x={-178} s={0.86} flower />
      <Jar x={-330} s={0.9} />
      <Crate x={-314} s={0.7} />
      <Crate x={62} s={0.62} />
      <Jar x={188} s={0.75} />
      {[-340, -302, -160, -142, 54, 190, 286, 330].map((x, i) => (
        <GrassTuft key={x} x={x} s={0.7 + (i % 3) * 0.16} delay={i * 0.4} />
      ))}
      <LampPost x={-152} h={108} delay={0.9} />
      <Cypress x={194} s={0.62} delay={2.1} />

      {/* a cat on the warm roof, a tiny sign of life */}
      <g className="v-cat" transform="translate(68 -166)">
        <path d="M-10 0 Q-12 -12 0 -12 Q10 -12 12 0Z" fill="var(--wall-deep)" />
        <circle cx="10" cy="-14" r="6" fill="var(--wall-deep)" />
        <path d="M7 -19 L6 -25 L10 -21 M13 -19 L16 -24 L16 -18" fill="var(--wall-deep)" />
        <path d="M10 0 Q20 -2 22 -12" stroke="var(--wall-deep)" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
});
