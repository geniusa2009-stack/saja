/**
 * The SAJA traveller — a parametric, animation-ready SVG character.
 * Stylized, not chibi (≈1:5 head ratio), expressive eyes and hands,
 * diverse by default. Parts are separate groups so CSS/motion can animate
 * blinking, breathing, walking, waving and celebrating independently.
 *
 * Art direction: one warm key light from the upper-left, a cool bounce under
 * the chin, and a soft contact shadow. Gradients replace filters so a world
 * full of travellers stays cheap to paint.
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
  const skinShade = shade(skin, -24);
  const skinLight = shade(skin, 16);
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0];
  const hairLight = shade(hair, 22);
  const cloth = OUTFIT_COLORS[look.outfitColor] ?? OUTFIT_COLORS[1];
  const clothDark = shade(cloth, -34);
  const clothLight = shade(cloth, 24);
  const headCloth = HIJAB_COLORS[look.hairColor] ?? HIJAB_COLORS[0];
  const headClothDark = shade(headCloth, -30);
  const headClothLight = shade(headCloth, 16);
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
          <stop offset="0" stopColor="#F6E8C6" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#F3E2BA" stopOpacity="0.4" />
          <stop offset="1" stopColor="#F6E8C6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}shadow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.42" />
          <stop offset="0.58" stopColor="#000" stopOpacity="0.2" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}skin`} cx="0.36" cy="0.3" r="0.78">
          <stop offset="0" stopColor={skinLight} />
          <stop offset="0.62" stopColor={skin} />
          <stop offset="1" stopColor={skinShade} />
        </radialGradient>
        <linearGradient id={`${uid}cloth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={clothLight} />
          <stop offset="0.62" stopColor={cloth} />
          <stop offset="1" stopColor={shade(cloth, -12)} />
        </linearGradient>
        <linearGradient id={`${uid}hair`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={hairLight} />
          <stop offset="0.55" stopColor={hair} />
          <stop offset="1" stopColor={shade(hair, -12)} />
        </linearGradient>
        <linearGradient id={`${uid}head`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={headClothLight} />
          <stop offset="0.58" stopColor={headCloth} />
          <stop offset="1" stopColor={headClothDark} />
        </linearGradient>
      </defs>

      <g className="char-flip">
        {!portrait && <ellipse className="char-shadow" cx="60" cy="207" rx="33" ry="6" fill={`url(#${uid}shadow)`} />}

        <g className="char-body">
          {/* Back hair / back drape */}
          {look.hair === 'long' && <path d="M37 46 Q34 88 42 98 L78 98 Q86 88 83 46 Q81 22 60 22 Q39 22 37 46Z" fill={`url(#${uid}hair)`} />}
          {covered && <path d="M33 52 Q31 20 60 19 Q89 20 87 52 L92 104 Q60 118 28 104 Z" fill={headClothDark} />}

          {/* Legs */}
          <g className="char-legs">
            <g className="leg leg-l">
              <rect x="47" y="140" width="10" height="62" rx="5" fill={longRobe ? clothDark : trousers} />
              <rect x="49" y="144" width="2.4" height="50" rx="1.2" fill={longRobe ? cloth : '#343D64'} opacity="0.45" />
              <ellipse cx="51" cy="204" rx="8" ry="4.2" fill={ink} />
              <path d="M44 203 Q51 207 58 203" stroke="#5A6488" strokeWidth="1" fill="none" opacity="0.45" />
            </g>
            <g className="leg leg-r">
              <rect x="63" y="140" width="10" height="62" rx="5" fill={longRobe ? clothDark : trousers} />
              <rect x="65" y="144" width="2.4" height="50" rx="1.2" fill={longRobe ? cloth : '#343D64'} opacity="0.4" />
              <ellipse cx="69" cy="204" rx="8" ry="4.2" fill={ink} />
              <path d="M62 203 Q69 207 76 203" stroke="#5A6488" strokeWidth="1" fill="none" opacity="0.45" />
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
                <path d="M43 91 Q60 84 77 91" stroke={clothLight} strokeWidth="1.2" fill="none" opacity="0.5" />
                <path d="M37 184 Q60 190 84 184" stroke={clothDark} strokeWidth="1.6" fill="none" opacity="0.45" />
                <path d="M36 191 Q60 198 85 191" stroke={clothLight} strokeWidth="1.2" fill="none" opacity="0.35" />
                <path d="M47 90 Q42 130 41 184 M73 90 Q78 130 79 184" stroke={clothDark} strokeWidth="0.9" fill="none" opacity="0.28" />
              </>
            )}
            {look.outfit === 'abaya' && (
              <>
                <path d="M37 88 Q60 78 83 88 L95 200 Q60 209 25 200 Z" fill={`url(#${uid}cloth)`} />
                <path d="M47 120 Q44 160 40 198" stroke={clothDark} strokeWidth="1" opacity="0.45" fill="none" />
                <path d="M73 120 Q76 160 80 198" stroke={clothDark} strokeWidth="1" opacity="0.45" fill="none" />
                <path d="M39 92 Q60 84 81 92" stroke={clothLight} strokeWidth="1.1" fill="none" opacity="0.45" />
                <path d="M28 198 Q60 206 92 198" stroke={clothDark} strokeWidth="2" fill="none" opacity="0.5" />
                <path d="M45 118 Q60 124 75 118" stroke={clothLight} strokeWidth="0.9" fill="none" opacity="0.28" />
              </>
            )}
            {look.outfit === 'jubba' && (
              <>
                <path d="M39 88 Q60 80 81 88 L85 198 Q60 203 35 198 Z" fill="#EFE6D6" />
                <path d="M37 88 Q46 83 54 84 L50 199 Q42 200 32 197 Z" fill={`url(#${uid}cloth)`} />
                <path d="M83 88 Q74 83 66 84 L70 199 Q78 200 88 197 Z" fill={`url(#${uid}cloth)`} />
                <path d="M52 85 Q60 96 68 85" stroke={clothDark} strokeWidth="1.3" fill="none" opacity="0.6" />
                <path d="M50 188 Q60 192 70 188" stroke={clothDark} strokeWidth="1.2" fill="none" opacity="0.4" />
                <path d="M36 91 Q42 128 39 190 M84 91 Q78 128 81 190" stroke={clothLight} strokeWidth="1" fill="none" opacity="0.4" />
              </>
            )}
            {look.outfit === 'tunic' && (
              <>
                <path d="M38 88 Q60 78 82 88 L86 162 Q60 168 34 162 Z" fill={`url(#${uid}cloth)`} />
                <path d="M54 84 L60 96 L66 84" stroke={clothDark} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
                <path d="M35 150 Q60 156 85 150" stroke={clothLight} strokeWidth="1" opacity="0.5" fill="none" />
                <path d="M37 156 Q60 163 84 156" stroke={clothDark} strokeWidth="3.4" fill="none" opacity="0.55" />
                <rect x="46" y="154" width="13" height="10" rx="2" fill={clothDark} opacity="0.35" />
                <path d="M49 158 H56" stroke={clothLight} strokeWidth="0.8" opacity="0.5" />
                <path d="M44 91 Q40 120 39 152 M76 91 Q80 120 81 152" stroke={clothDark} strokeWidth="0.9" fill="none" opacity="0.25" />
              </>
            )}
            {look.outfit === 'hoodie' && (
              <>
                <path d="M40 84 Q60 94 80 84 Q78 76 60 76 Q42 76 40 84Z" fill={clothDark} />
                <path d="M37 89 Q60 80 83 89 L85 144 Q60 150 35 144 Z" fill={`url(#${uid}cloth)`} />
                <path d="M46 124 H74 L71 136 H49 Z" fill={clothDark} opacity="0.55" />
                <path d="M56 88 V100 M64 88 V100" stroke={clothLight} strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="56" cy="101" r="1.4" fill={clothLight} />
                <circle cx="64" cy="101" r="1.4" fill={clothLight} />
                <path d="M38 139 Q60 145 82 139" stroke={clothLight} strokeWidth="1.1" fill="none" opacity="0.4" />
                <path d="M43 92 Q38 112 38 136 M77 92 Q82 112 82 136" stroke={clothDark} strokeWidth="0.9" fill="none" opacity="0.28" />
              </>
            )}
          </g>

          {/* Accessories on the body */}
          {look.accessory === 'satchel' && (
            <g>
              <path d="M41 88 L77 134" stroke="#6B4A2E" strokeWidth="3" strokeLinecap="round" />
              <path d="M42 89 L76 133" stroke="#B9905F" strokeWidth="0.9" strokeLinecap="round" opacity="0.6" />
              <rect x="68" y="128" width="17" height="14" rx="3.5" fill="#8A5E38" />
              <rect x="68" y="128" width="17" height="5" rx="2.5" fill="#6B4A2E" />
              <path d="M70 133 H83" stroke="#C9A45C" strokeWidth="0.7" opacity="0.55" strokeDasharray="1 2" />
              <circle cx="76.5" cy="134.5" r="1.2" fill="#DDBE7F" />
            </g>
          )}

          {/* Arms */}
          <g className="arm arm-l">
            <path d="M40 90 Q32 110 31 138" stroke={cloth} strokeWidth="10" strokeLinecap="round" fill="none" />
            <path d="M40 90 Q32 110 31 138" stroke={clothDark} strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.18" />
            <path d="M37 96 Q33 112 32 130" stroke={clothLight} strokeWidth="1.4" fill="none" opacity="0.5" strokeLinecap="round" />
            <path d="M28 132 Q31 136 34 135" stroke={clothDark} strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <circle cx="31" cy="142" r="5" fill={`url(#${uid}skin)`} />
            <path d="M28 140 Q30 139 31 141" stroke={skinShade} strokeWidth="0.8" fill="none" opacity="0.6" />
            {look.accessory === 'lantern' && (
              <g className="char-lantern">
                <circle cx="30" cy="160" r="16" fill={`url(#${uid}glow)`} />
                <path d="M30 146 V150" stroke="#C9A45C" strokeWidth="1.2" />
                <path d="M25 151 H35 L34 166 Q30 169 26 166 Z" fill="#F3E2BA" stroke="#C9A45C" strokeWidth="1.2" />
                <path d="M26 151 Q30 146 34 151" fill="#C9A45C" />
                <path d="M30 155 Q32 158 30 162 Q28 158 30 155Z" fill="#FFD27A" />
                <path d="M23 168 H37" stroke="#C9A45C" strokeWidth="1.2" strokeLinecap="round" />
              </g>
            )}
          </g>
          <g className="arm arm-r">
            <path d="M80 90 Q88 110 89 138" stroke={cloth} strokeWidth="10" strokeLinecap="round" fill="none" />
            <path d="M80 90 Q88 110 89 138" stroke={clothDark} strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.18" />
            <path d="M82 98 Q86 114 87 130" stroke={clothLight} strokeWidth="1.4" fill="none" opacity="0.45" strokeLinecap="round" />
            <path d="M86 132 Q89 136 92 135" stroke={clothDark} strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <circle cx="89" cy="142" r="5" fill={`url(#${uid}skin)`} />
            <path d="M90 140 Q92 140 92 142" stroke={skinShade} strokeWidth="0.8" fill="none" opacity="0.6" />
          </g>

          {/* Neck */}
          {!covered && <rect x="55" y="68" width="10" height="16" rx="4" fill={skinShade} />}
          {!covered && <path d="M54 78 Q60 84 66 78" stroke={skinShade} strokeWidth="1.2" fill="none" opacity="0.55" />}

          {/* Hijab front drape sits over the torso */}
          {covered && <path d="M36 56 Q34 30 60 28 Q86 30 84 56 Q88 86 60 96 Q32 86 36 56Z" fill={`url(#${uid}head)`} />}
          {covered && (
            <g fill="none" strokeLinecap="round">
              <path d="M43 40 Q48 54 44 80" stroke={headClothDark} strokeWidth="1.1" opacity="0.35" />
              <path d="M64 70 Q68 84 78 88" stroke={headClothDark} strokeWidth="1.1" opacity="0.3" />
              <path d="M41 40 Q38 58 43 82" stroke={headClothLight} strokeWidth="1" opacity="0.4" />
              <path d="M44 88 Q60 94 76 88" stroke={headClothDark} strokeWidth="1" opacity="0.28" />
            </g>
          )}

          {look.accessory === 'scarf' && !covered && (
            <g>
              <path d="M44 80 Q60 90 76 80 Q76 88 60 94 Q44 88 44 80Z" fill="#C2463C" />
              <path d="M44 80 Q60 88 76 80" stroke="#E58B7E" strokeWidth="1" fill="none" opacity="0.5" />
              <path d="M66 88 L70 112 L63 110 L61 90Z" fill="#A83A31" />
              <path d="M64 94 L66 108" stroke="#E58B7E" strokeWidth="0.8" opacity="0.4" />
            </g>
          )}

          {/* Head */}
          <g className="char-head">
            {!covered && (
              <>
                <ellipse cx="38.5" cy="54" rx="3.4" ry="4.6" fill={skinShade} />
                <ellipse cx="81.5" cy="54" rx="3.4" ry="4.6" fill={skinShade} />
                <ellipse cx="38.2" cy="53" rx="1.5" ry="2.4" fill={skinLight} opacity="0.3" />
              </>
            )}
            <ellipse cx="60" cy={covered ? 55 : 51} rx={covered ? 17 : 21.5} ry={covered ? 19.5 : 23.5} fill={`url(#${uid}skin)`} />
            <path d={covered ? 'M71 38 Q78 50 74 68' : 'M72 34 Q80 48 75 68'} stroke={skinShade} strokeWidth="2.2" fill="none" opacity="0.17" strokeLinecap="round" />

            {/* Front hair / headwear */}
            {look.hair === 'short' && <path d="M38.5 50 Q37 25 60 24 Q83 25 81.5 50 Q79 40 72 36 Q62 40 50 37 Q42 40 38.5 50Z" fill={`url(#${uid}hair)`} />}
            {look.hair === 'short' && <path d="M44 34 Q52 28 64 29" stroke={hairLight} strokeWidth="1.4" fill="none" opacity="0.45" strokeLinecap="round" />}
            {look.hair === 'curly' && (
              <g fill={`url(#${uid}hair)`}>
                <path d="M38 50 Q36 30 46 26 Q52 18 60 22 Q68 18 74 26 Q84 30 82 50 Q78 40 70 38 Q60 42 50 38 Q42 40 38 50Z" />
                <circle cx="44" cy="31" r="6" />
                <circle cx="53" cy="25" r="6.5" />
                <circle cx="64" cy="24" r="6.5" />
                <circle cx="74" cy="29" r="6" />
                <circle cx="40" cy="41" r="4.5" />
                <circle cx="80" cy="41" r="4.5" />
              </g>
            )}
            {look.hair === 'curly' && <path d="M47 27 Q54 22 62 23" stroke={hairLight} strokeWidth="1.6" fill="none" opacity="0.4" strokeLinecap="round" />}
            {look.hair === 'long' && <path d="M38.5 48 Q40 25 60 25 Q80 25 81.5 48 Q74 36 62 36 Q52 40 44 38 Q40 42 38.5 48Z" fill={`url(#${uid}hair)`} />}
            {look.hair === 'long' && <path d="M45 31 Q54 26 65 28" stroke={hairLight} strokeWidth="1.3" fill="none" opacity="0.4" strokeLinecap="round" />}
            {look.hair === 'kufi' && (
              <g>
                <path d="M39 50 Q38 36 42 32 Q60 42 78 32 Q82 36 81 50 Q78 42 60 42 Q42 42 39 50Z" fill={`url(#${uid}hair)`} />
                <path d="M40 38 Q41 22 60 21 Q79 22 80 38 Q60 32 40 38Z" fill="#F4ECDD" />
                <path d="M41 36 Q60 30 79 36" stroke="#DDBE7F" strokeWidth="1" fill="none" strokeDasharray="1.5 2.5" />
                <path d="M44 30 Q54 25 66 26" stroke="#FFF9EC" strokeWidth="1.2" fill="none" opacity="0.6" strokeLinecap="round" />
              </g>
            )}
            {look.hair === 'wrap' && (
              <g>
                <path d="M38 46 Q33 14 60 11 Q88 14 82 46 Q72 34 60 36 Q48 34 38 46Z" fill={`url(#${uid}head)`} />
                <path d="M42 30 Q60 20 78 30 M44 38 Q60 26 76 38" stroke={headClothDark} strokeWidth="1.4" fill="none" strokeLinecap="round" />
                <path d="M46 21 Q58 15 70 19" stroke={headClothLight} strokeWidth="1.3" fill="none" opacity="0.45" strokeLinecap="round" />
              </g>
            )}
            {covered && <path d="M42 50 Q43 32 60 31 Q77 32 78 50" stroke={headClothDark} strokeWidth="1.3" fill="none" opacity="0.6" />}

            {/* Warm rim light along the key-light side */}
            <path d={covered ? 'M43 34 Q38 46 42 68' : 'M42 30 Q36 44 40 66'} stroke="#F6E8C6" strokeWidth="1.1" fill="none" opacity="0.2" strokeLinecap="round" />

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
                    <path d="M49.6 51.1 Q52.5 49.7 55.4 51.1 M64.6 51.1 Q67.5 49.7 70.4 51.1" stroke={ink} strokeWidth="0.8" fill="none" opacity="0.55" strokeLinecap="round" />
                    <path d="M56.2 54.6 Q57.2 54.9 58 54.4 M71.2 54.6 Q72.2 54.9 73 54.4" stroke={ink} strokeWidth="0.7" fill="none" opacity="0.35" strokeLinecap="round" />
                  </g>
                )}
              </g>
              <circle cx="47" cy="61" r="3.6" fill="#E57F72" opacity="0.22" />
              <circle cx="73" cy="61" r="3.6" fill="#E57F72" opacity="0.22" />
              <circle cx="47.4" cy="60.4" r="1.2" fill="#F6B6A9" opacity="0.25" />
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
              {expression === 'happy' && <path d="M57 66.5 Q60 68 63 66.5" stroke="#E58B7E" strokeWidth="0.9" fill="none" opacity="0.5" strokeLinecap="round" />}
              {look.accessory === 'glasses' && (
                <g stroke="#2A2233" strokeWidth="1.3" fill="rgba(255,255,255,0.08)">
                  <rect x="46.5" y="48.5" width="12" height="10" rx="4" />
                  <rect x="61.5" y="48.5" width="12" height="10" rx="4" />
                  <path d="M58.5 52.5 Q60 51.2 61.5 52.5" fill="none" />
                  <path d="M46.5 52 Q45 52 44 53.5 M73.5 52 Q75 52 76 53.5" fill="none" strokeWidth="1" />
                  <path d="M48 50.5 Q49.5 49.5 51 50" stroke="#fff" strokeWidth="0.6" fill="none" opacity="0.45" />
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
