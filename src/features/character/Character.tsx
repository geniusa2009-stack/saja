/**
 * The SAJA traveller — a parametric, animation-ready SVG character.
 * Stylized, not chibi (≈1:5 head ratio), expressive eyes and hands,
 * diverse by default. Parts are separate groups so CSS/motion can animate
 * blinking, breathing, walking, waving and celebrating independently.
 */
import { memo, useId } from 'react';
import type { CharacterLook } from '@/domain/types';
import { HAIR_COLORS, HIJAB_COLORS, OUTFIT_COLORS, SKIN_TONES, type Expression, type Pose } from './palette';
import './character.css';




function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt));
  const b = Math.min(255, Math.max(0, (n & 255) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface Props {
  look: CharacterLook;
  size?: number;
  expression?: Expression;
  pose?: Pose;
  walking?: boolean;
  facing?: 'left' | 'right';
  portrait?: boolean;
  animated?: boolean;
  title?: string;
  className?: string;
}

export const Character = memo(function Character({ look, size = 120, expression = 'calm', pose = 'idle', walking, facing = 'right', portrait, animated = true, title, className = '' }: Props) {
  const uid = useId().replace(/:/g, '');
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[2];
  const skinShade = shade(skin, -22);
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0];
  const cloth = OUTFIT_COLORS[look.outfitColor] ?? OUTFIT_COLORS[1];
  const clothDark = shade(cloth, -32);
  const clothLight = shade(cloth, 22);
  const headCloth = HIJAB_COLORS[look.hairColor] ?? HIJAB_COLORS[0];
  const headClothDark = shade(headCloth, -28);
  const trousers = '#252C4D';
  const ink = '#1B1A2C';
  const longRobe = look.outfit === 'thobe' || look.outfit === 'abaya' || look.outfit === 'jubba';
  const covered = look.hair === 'hijab';

  const vb = portrait ? '22 10 76 76' : '0 0 120 220';
  const w = size;
  const h = portrait ? size : (size * 220) / 120;
  const cls = ['saja-char', animated && 'is-animated', walking && 'is-walking', `pose-${pose}`, `expr-${expression}`, facing === 'left' && 'face-left', className].filter(Boolean).join(' ');

  return (
    <svg viewBox={vb} width={w} height={h} className={cls} {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`${uid}glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#F6E8C6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#F6E8C6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}cloth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={clothLight} />
          <stop offset="1" stopColor={cloth} />
        </linearGradient>
      </defs>

      <g className="char-flip">
        {!portrait && <ellipse className="char-shadow" cx="60" cy="208" rx="30" ry="5" fill="#000" opacity="0.28" />}

        <g className="char-body">
          {/* Back hair / back drape */}
          {look.hair === 'long' && <path d="M37 46 Q34 88 42 98 L78 98 Q86 88 83 46 Q81 22 60 22 Q39 22 37 46Z" fill={hair} />}
          {covered && <path d="M33 52 Q31 20 60 19 Q89 20 87 52 L92 104 Q60 118 28 104 Z" fill={headClothDark} />}

          {/* Legs */}
          <g className="char-legs">
            <g className="leg leg-l">
              <rect x="47" y="140" width="10" height="62" rx="5" fill={longRobe ? clothDark : trousers} />
              <ellipse cx="51" cy="204" rx="8" ry="4.2" fill={ink} />
            </g>
            <g className="leg leg-r">
              <rect x="63" y="140" width="10" height="62" rx="5" fill={longRobe ? clothDark : trousers} />
              <ellipse cx="69" cy="204" rx="8" ry="4.2" fill={ink} />
            </g>
          </g>

          {/* Torso / outfit */}
          <g className="char-torso">
            {look.outfit === 'thobe' && (
              <>
                <path d="M38 88 Q60 78 82 88 L87 198 Q60 204 33 198 Z" fill={`url(#${uid}cloth)`} />
                <path d="M60 84 V118" stroke={clothDark} strokeWidth="1.2" opacity="0.6" />
                <circle cx="60" cy="96" r="1" fill={clothDark} />
                <circle cx="60" cy="104" r="1" fill={clothDark} />
              </>
            )}
            {look.outfit === 'abaya' && (
              <>
                <path d="M37 88 Q60 78 83 88 L95 200 Q60 209 25 200 Z" fill={`url(#${uid}cloth)`} />
                <path d="M47 120 Q44 160 40 198" stroke={clothDark} strokeWidth="1" opacity="0.45" fill="none" />
                <path d="M73 120 Q76 160 80 198" stroke={clothDark} strokeWidth="1" opacity="0.45" fill="none" />
              </>
            )}
            {look.outfit === 'jubba' && (
              <>
                <path d="M39 88 Q60 80 81 88 L85 198 Q60 203 35 198 Z" fill="#EFE6D6" />
                <path d="M37 88 Q46 83 54 84 L50 199 Q42 200 32 197 Z" fill={`url(#${uid}cloth)`} />
                <path d="M83 88 Q74 83 66 84 L70 199 Q78 200 88 197 Z" fill={`url(#${uid}cloth)`} />
              </>
            )}
            {look.outfit === 'tunic' && (
              <>
                <path d="M38 88 Q60 78 82 88 L86 162 Q60 168 34 162 Z" fill={`url(#${uid}cloth)`} />
                <path d="M54 84 L60 96 L66 84" stroke={clothDark} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
                <path d="M35 150 Q60 156 85 150" stroke={clothLight} strokeWidth="1" opacity="0.5" fill="none" />
              </>
            )}
            {look.outfit === 'hoodie' && (
              <>
                <path d="M40 84 Q60 94 80 84 Q78 76 60 76 Q42 76 40 84Z" fill={clothDark} />
                <path d="M37 89 Q60 80 83 89 L85 144 Q60 150 35 144 Z" fill={`url(#${uid}cloth)`} />
                <path d="M46 124 H74 L71 136 H49 Z" fill={clothDark} opacity="0.55" />
                <path d="M56 88 V100 M64 88 V100" stroke={clothLight} strokeWidth="1.2" strokeLinecap="round" />
              </>
            )}
          </g>

          {/* Accessories on the body */}
          {look.accessory === 'satchel' && (
            <g>
              <path d="M41 88 L77 134" stroke="#6B4A2E" strokeWidth="3" strokeLinecap="round" />
              <rect x="68" y="128" width="17" height="14" rx="3.5" fill="#8A5E38" />
              <rect x="68" y="128" width="17" height="5" rx="2.5" fill="#6B4A2E" />
              <circle cx="76.5" cy="134.5" r="1.2" fill="#DDBE7F" />
            </g>
          )}

          {/* Arms */}
          <g className="arm arm-l">
            <path d="M40 90 Q32 110 31 138" stroke={look.outfit === 'jubba' ? cloth : cloth} strokeWidth="10" strokeLinecap="round" fill="none" />
            <path d="M40 90 Q32 110 31 138" stroke={clothDark} strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.18" />
            <circle cx="31" cy="142" r="5" fill={skin} />
            {look.accessory === 'lantern' && (
              <g className="char-lantern">
                <circle cx="30" cy="160" r="14" fill={`url(#${uid}glow)`} />
                <path d="M30 146 V150" stroke="#C9A45C" strokeWidth="1.2" />
                <path d="M25 151 H35 L34 166 Q30 169 26 166 Z" fill="#F3E2BA" stroke="#C9A45C" strokeWidth="1.2" />
                <path d="M26 151 Q30 146 34 151" fill="#C9A45C" />
              </g>
            )}
          </g>
          <g className="arm arm-r">
            <path d="M80 90 Q88 110 89 138" stroke={cloth} strokeWidth="10" strokeLinecap="round" fill="none" />
            <path d="M80 90 Q88 110 89 138" stroke={clothDark} strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.18" />
            <circle cx="89" cy="142" r="5" fill={skin} />
          </g>

          {/* Neck */}
          {!covered && <rect x="55" y="68" width="10" height="16" rx="4" fill={skinShade} />}

          {/* Hijab front drape sits over the torso */}
          {covered && <path d="M36 56 Q34 30 60 28 Q86 30 84 56 Q88 86 60 96 Q32 86 36 56Z" fill={headCloth} />}

          {look.accessory === 'scarf' && !covered && (
            <g>
              <path d="M44 80 Q60 90 76 80 Q76 88 60 94 Q44 88 44 80Z" fill="#C2463C" />
              <path d="M66 88 L70 112 L63 110 L61 90Z" fill="#A83A31" />
            </g>
          )}

          {/* Head */}
          <g className="char-head">
            {!covered && (
              <>
                <ellipse cx="38.5" cy="54" rx="3.4" ry="4.6" fill={skinShade} />
                <ellipse cx="81.5" cy="54" rx="3.4" ry="4.6" fill={skinShade} />
              </>
            )}
            <ellipse cx="60" cy={covered ? 55 : 51} rx={covered ? 17 : 21.5} ry={covered ? 19.5 : 23.5} fill={skin} />

            {/* Front hair / headwear */}
            {look.hair === 'short' && <path d="M38.5 50 Q37 25 60 24 Q83 25 81.5 50 Q79 40 72 36 Q62 40 50 37 Q42 40 38.5 50Z" fill={hair} />}
            {look.hair === 'curly' && (
              <g fill={hair}>
                <path d="M38 50 Q36 30 46 26 Q52 18 60 22 Q68 18 74 26 Q84 30 82 50 Q78 40 70 38 Q60 42 50 38 Q42 40 38 50Z" />
                <circle cx="44" cy="31" r="6" />
                <circle cx="53" cy="25" r="6.5" />
                <circle cx="64" cy="24" r="6.5" />
                <circle cx="74" cy="29" r="6" />
                <circle cx="40" cy="41" r="4.5" />
                <circle cx="80" cy="41" r="4.5" />
              </g>
            )}
            {look.hair === 'long' && <path d="M38.5 48 Q40 25 60 25 Q80 25 81.5 48 Q74 36 62 36 Q52 40 44 38 Q40 42 38.5 48Z" fill={hair} />}
            {look.hair === 'kufi' && (
              <g>
                <path d="M39 50 Q38 36 42 32 Q60 42 78 32 Q82 36 81 50 Q78 42 60 42 Q42 42 39 50Z" fill={hair} />
                <path d="M40 38 Q41 22 60 21 Q79 22 80 38 Q60 32 40 38Z" fill="#F4ECDD" />
                <path d="M41 36 Q60 30 79 36" stroke="#DDBE7F" strokeWidth="1" fill="none" strokeDasharray="1.5 2.5" />
              </g>
            )}
            {look.hair === 'wrap' && (
              <g>
                <path d="M38 46 Q33 14 60 11 Q88 14 82 46 Q72 34 60 36 Q48 34 38 46Z" fill={headCloth} />
                <path d="M42 30 Q60 20 78 30 M44 38 Q60 26 76 38" stroke={headClothDark} strokeWidth="1.4" fill="none" strokeLinecap="round" />
              </g>
            )}
            {covered && <path d="M42 50 Q43 32 60 31 Q77 32 78 50" stroke={headClothDark} strokeWidth="1.3" fill="none" opacity="0.6" />}

            {/* Face */}
            <g className="char-face">
              <g className="brows" stroke={look.hair === 'hijab' || look.hair === 'wrap' ? '#2B1F1C' : hair} strokeWidth="1.6" strokeLinecap="round" fill="none">
                <path className="brow-l" d="M49 45.5 Q52.5 43.8 56 45.2" />
                <path className="brow-r" d="M64 45.2 Q67.5 43.8 71 45.5" />
              </g>
              <g className="eyes">
                {expression === 'happy' ? (
                  <g stroke={ink} strokeWidth="1.8" fill="none" strokeLinecap="round">
                    <path d="M49.5 54 Q52.5 50.5 55.5 54" />
                    <path d="M64.5 54 Q67.5 50.5 70.5 54" />
                  </g>
                ) : (
                  <g className="eye-blink">
                    <ellipse cx="52.5" cy="53.5" rx="2.7" ry={expression === 'surprised' ? 3.8 : 3.3} fill={ink} />
                    <ellipse cx="67.5" cy="53.5" rx="2.7" ry={expression === 'surprised' ? 3.8 : 3.3} fill={ink} />
                    <circle cx="53.4" cy="52.3" r="0.95" fill="#fff" />
                    <circle cx="68.4" cy="52.3" r="0.95" fill="#fff" />
                  </g>
                )}
              </g>
              <circle cx="47" cy="61" r="3.6" fill="#E57F72" opacity="0.22" />
              <circle cx="73" cy="61" r="3.6" fill="#E57F72" opacity="0.22" />
              <path d="M59 57.5 Q60 59.5 61.2 58" stroke={skinShade} strokeWidth="1.3" fill="none" strokeLinecap="round" />
              {expression === 'surprised' ? (
                <ellipse cx="60" cy="65" rx="2.4" ry="3" fill="#6B2E2E" />
              ) : expression === 'thinking' ? (
                <path d="M56 65 Q60 64 64.5 63" stroke="#6B2E2E" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              ) : expression === 'happy' ? (
                <path d="M54.5 62.5 Q60 69 65.5 62.5 Z" fill="#6B2E2E" />
              ) : (
                <path d="M55.5 63.3 Q60 67 64.5 63.3" stroke="#6B2E2E" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              )}
              {look.accessory === 'glasses' && (
                <g stroke="#2A2233" strokeWidth="1.3" fill="rgba(255,255,255,0.08)">
                  <rect x="46.5" y="48.5" width="12" height="10" rx="4" />
                  <rect x="61.5" y="48.5" width="12" height="10" rx="4" />
                  <path d="M58.5 52.5 Q60 51.2 61.5 52.5" fill="none" />
                </g>
              )}
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
});

/** Arch-topped avatar with a character portrait — the gateway at small scale. */
export function Avatar({ look, size = 44, gold, label }: { look: CharacterLook; size?: number; gold?: boolean; label?: string }) {
  return (
    <span className={`arch ${gold ? 'arch--gold' : ''}`} style={{ width: size, height: size * 1.15 }} role={label ? 'img' : undefined} aria-label={label}>
      <Character look={look} portrait size={size * 1.02} animated={false} />
    </span>
  );
}
