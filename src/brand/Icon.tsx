/**
 * SAJA icon set — 24 grid · 1.75 stroke · round caps (brand board §04).
 * The first eight are the brand's own; the rest are drawn to the same rules.
 */
const P = {
  home: ['M4 21V11C4 8 8 5 12 3C16 5 20 8 20 11V21Z', 'M10 21V16A2 2 0 0 1 14 16V21'],
  journey: ['M6 21C6 15 18 16 18 10C18 6.5 12 6.5 12 4', 'circle:12,3,1'],
  learn: ['M3 5C6 4 9 4 12 6V20C9 18 6 18 3 19Z', 'M21 5C18 4 15 4 12 6V20C15 18 18 18 21 19Z'],
  play: ['circle:12,12,9', 'M10 8.5L15.5 12L10 15.5Z'],
  day: ['M3 18H21', 'M7 18A5 5 0 0 1 17 18', 'M12 6V9M5.5 9.5L7.5 11.5M18.5 9.5L16.5 11.5'],
  community: ['circle:12,8,3', 'circle:5,11,2', 'circle:19,11,2', 'M6 20C6 16.5 8.7 14 12 14S18 16.5 18 20'],
  scholar: ['M4 5H20V16H9L4 20Z', 'M9 10.5L11 12.5L15 8.5'],
  explore: ['circle:12,12,9', 'M15.5 8.5L13.5 13.5L8.5 15.5L10.5 10.5Z'],
  profile: ['M12 3C15 3 17 5.2 17 8S15 13 12 13 7 10.8 7 8 9 3 12 3Z', 'M4 21C4 17.5 7.5 15 12 15S20 17.5 20 21'],
  map: ['M3 6L9 4L15 6L21 4V18L15 20L9 18L3 20Z', 'M9 4V18', 'M15 6V20'],
  close: ['M6 6L18 18', 'M18 6L6 18'],
  back: ['M15 5L8 12L15 19'],
  forward: ['M9 5L16 12L9 19'],
  down: ['M5 9L12 16L19 9'],
  up: ['M5 15L12 8L19 15'],
  send: ['M4 12L20 4L14 20L11 13Z', 'M11 13L20 4'],
  star: ['M12 3C12.6 9 13 10.5 18 12C13 13.5 12.6 15 12 21C11.4 15 11 13.5 6 12C11 10.5 11.4 9 12 3Z'],
  check: ['M5 12.5L10 17L19 7'],
  moon: ['M19 14.5A8 8 0 0 1 9.5 5A8 8 0 1 0 19 14.5Z'],
  sun: ['circle:12,12,4', 'M12 2.5V4.5M12 19.5V21.5M2.5 12H4.5M19.5 12H21.5M5.3 5.3L6.7 6.7M17.3 17.3L18.7 18.7M5.3 18.7L6.7 17.3M17.3 6.7L18.7 5.3'],
  shield: ['M12 3L19 6V11C19 15.5 16 19 12 21C8 19 5 15.5 5 11V6Z', 'M9 12L11 14L15 10'],
  layers: ['M12 3L21 8L12 13L3 8Z', 'M3 12.5L12 17.5L21 12.5', 'M3 16.5L12 21.5L21 16.5'],
  flag: ['M5 21V4', 'M5 4H17L15 8L17 12H5'],
  block: ['circle:12,12,9', 'M5.6 5.6L18.4 18.4'],
  reply: ['M9 7L4 12L9 17', 'M4 12H14C17.3 12 20 14.7 20 18V19'],
  clock: ['circle:12,12,9', 'M12 7V12L15.5 14'],
  bell: ['M6 16V11A6 6 0 0 1 18 11V16L19.5 18H4.5Z', 'M10 20.5A2 2 0 0 0 14 20.5'],
  cloud: ['M7 18A4 4 0 0 1 6.5 10A5.5 5.5 0 0 1 17 8.5A4.75 4.75 0 0 1 17.5 18Z'],
  key: ['circle:8,15,4', 'M11 12L20 3', 'M16.5 6.5L19 9'],
  plus: ['M12 5V19', 'M5 12H19'],
  trash: ['M4 7H20', 'M9 7V4H15V7', 'M6 7L7 20H17L18 7'],
  eye: ['M2.5 12C4.5 7.5 8 5 12 5S19.5 7.5 21.5 12C19.5 16.5 16 19 12 19S4.5 16.5 2.5 12Z', 'circle:12,12,3'],
  settings: ['circle:12,12,3', 'M12 2.5V5M12 19V21.5M2.5 12H5M19 12H21.5M5.3 5.3L7.1 7.1M16.9 16.9L18.7 18.7M5.3 18.7L7.1 16.9M16.9 7.1L18.7 5.3'],
  globe: ['circle:12,12,9', 'M3 12H21', 'M12 3C15 6 15 18 12 21C9 18 9 6 12 3Z'],
  mic: ['M9 5A3 3 0 0 1 15 5V11A3 3 0 0 1 9 11Z', 'M5.5 11A6.5 6.5 0 0 0 18.5 11', 'M12 17.5V21'],
  image: ['M4 5H20V19H4Z', 'circle:9,10,1.8', 'M4 17L10 12L14 15.5L16.5 13.5L20 16.5'],
  video: ['M3 6H16V18H3Z', 'M16 10L21 7V17L16 14'],
  file: ['M6 3H14L19 8V21H6Z', 'M14 3V8H19', 'M9 13H16M9 17H14'],
  lantern: ['M9 4H15', 'M12 2V4', 'M8 7C8 5.5 16 5.5 16 7L17 16C17 18 7 18 7 16Z', 'M9 20H15', 'M12 10V13'],
  heart: ['M12 20C12 20 4 15 4 9.5A4 4 0 0 1 12 7.5A4 4 0 0 1 20 9.5C20 15 12 20 12 20Z'],
  pin: ['M12 21S5 14.5 5 9.5A7 7 0 0 1 19 9.5C19 14.5 12 21 12 21Z', 'circle:12,9.5,2.5'],
  pinned: ['M9 3H15L14 9L17 12H7L10 9Z', 'M12 12V21'],
  search: ['circle:11,11,7', 'M16 16L21 21'],
  info: ['circle:12,12,9', 'M12 11V16.5', 'M12 7.8V8'],
  refresh: ['M20 11A8 8 0 1 0 17.7 16.7', 'M20 5V11H14'],
  sparkle: ['M12 4C12.4 8.5 13.5 9.6 18 10C13.5 10.4 12.4 11.5 12 16C11.6 11.5 10.5 10.4 6 10C10.5 9.6 11.6 8.5 12 4Z', 'M18 16C18.2 17.6 18.4 17.8 20 18C18.4 18.2 18.2 18.4 18 20C17.8 18.4 17.6 18.2 16 18C17.6 17.8 17.8 17.6 18 16Z'],
  lock: ['M6 11H18V21H6Z', 'M8.5 11V8A3.5 3.5 0 0 1 15.5 8V11'],
  water: ['M12 3C12 3 6 10 6 14A6 6 0 0 0 18 14C18 10 12 3 12 3Z'],
  hand: ['M8 12V6A1.5 1.5 0 0 1 11 6V11', 'M11 10V4.5A1.5 1.5 0 0 1 14 4.5V11', 'M14 10V5.5A1.5 1.5 0 0 1 17 5.5V14C17 18 14.5 21 11 21C8 21 6.5 19 5 16L3.5 13A1.4 1.4 0 0 1 6 11.8L8 14'],
  compass: ['circle:12,12,9', 'M12 3V5M12 19V21M3 12H5M19 12H21', 'M14.5 9.5L13 13L9.5 14.5L11 11Z'],
  target: ['circle:12,12,9', 'circle:12,12,5', 'circle:12,12,1'],
  wand: ['M4 20L15 9', 'M14 4L15 6L17 7L15 8L14 10L13 8L11 7L13 6Z', 'M19 11L19.5 12L20.5 12.5L19.5 13L19 14L18.5 13L17.5 12.5L18.5 12Z'],
  focus: ['M4 8V4H8', 'M16 4H20V8', 'M20 16V20H16', 'M8 20H4V16', 'circle:12,12,3'],
  quote: ['M9 7C6 8 5 10 5 13V17H10V12H7.5C7.5 10.5 8.3 9.3 9.8 8.6Z', 'M18 7C15 8 14 10 14 13V17H19V12H16.5C16.5 10.5 17.3 9.3 18.8 8.6Z'],
  more: ['circle:5,12,1.2', 'circle:12,12,1.2', 'circle:19,12,1.2'],
  upload: ['M12 16V4', 'M7 9L12 4L17 9', 'M4 16V20H20V16'],
  seal: ['M12 3L19 6V11C19 15.5 16 19 12 21C8 19 5 15.5 5 11V6Z', 'circle:12,11,2.5'],
  keyboard: ['M3 7H21V17H3Z', 'M6 10H7M9 10H10M12 10H13M15 10H16M18 10H18.5M7 14H17'],
  edit: ['M4 20H8L19 9L15 5L4 16Z', 'M13 7L17 11'],
} satisfies Record<string, string[]>;

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, className, strokeWidth = 1.75, title }: { name: IconName; size?: number; className?: string; strokeWidth?: number; title?: string }) {
  const parts: string[] = P[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `icon ${className}` : 'icon'}
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
    >
      {parts.map((d, i) => {
        if (d.startsWith('circle:')) {
          const [cx, cy, r] = d.slice(7).split(',').map(Number);
          return <circle key={i} cx={cx} cy={cy} r={r} />;
        }
        return <path key={i} d={d} />;
      })}
    </svg>
  );
}
