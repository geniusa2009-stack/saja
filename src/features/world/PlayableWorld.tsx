import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Character } from '@/features/character/Character';
import { useI18n } from '@/i18n';
import type { CharacterLook } from '@/domain/types';
import { NPCS } from '@/content/npcs';
import { Button } from '@/design-system';
import { INTERACTION_RADIUS } from './game/scenes';
import { cameraOffset, renderPoint } from './game/camera';
import { fixedSteps } from './game/fixedStep';
import { inInteractionRange } from './game/interactions';
import { joystickFromPointer, keyboardInput, mergeInput } from './game/input';
import { createPlayer, getGameScene } from './game/sceneManager';
import { isPlayerMoving, renderedFacing } from './game/animation';
import { startGameLoop } from './game/gameLoop';
import type { GameSceneId, PlayerState, Point } from './game/types';
import { questsForNpc } from '@/features/quests/definitions';
import { webglAvailable } from './game/webgl';
import { QuestRunner } from '@/features/quests/QuestRunner';

const Village3D = lazy(() => import('./Village3D').then((module) => ({ default: module.Village3D })));

interface Props {
  sceneId: GameSceneId;
  look: CharacterLook;
  playerName: string;
  rtl: boolean;
  reducedMotion: boolean;
  onExit: () => void;
}

/** The knob follows the thumb, so the player sees the stick is held and in which direction. */
function moveKnob(stick: HTMLElement, value: Point, radius: number) {
  const knob = stick.querySelector('i');
  const held = value.x !== 0 || value.y !== 0;
  stick.dataset.active = String(held);
  if (knob) knob.style.translate = held ? `${value.x * radius * 0.45}px ${value.y * radius * 0.45}px` : '';
}

export function PlayableWorld({ sceneId, look, playerName, rtl, reducedMotion, onExit }: Props) {
  const scene = getGameScene(sceneId);
  const { l, isRTL } = useI18n();
  const navigate = useNavigate();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const npcRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef(new Set<string>());
  const joystickRef = useRef<Point>({ x: 0, y: 0 });
  const pointerRef = useRef<number | null>(null);
  const playerState = useRef<PlayerState>(createPlayer(sceneId, rtl));
  const camera = useRef<Point>({ x: 0, y: 0 });
  const [viewport, setViewport] = useState<Point>({ x: 1, y: 1 });
  const [nearby, setNearby] = useState(false);
  const [talking, setTalking] = useState(false);
  const [line, setLine] = useState(0);
  const [moving, setMoving] = useState(false);
  // 3D only where the browser can draw it; otherwise the 2D village (same scene, same gameplay).
  const can3D = sceneId === 'village' && webglAvailable();
  const [use3D, setUse3D] = useState(can3D);
  const sprintRef = useRef(false);
  const [facing, setFacing] = useState<'left' | 'right'>(rtl ? 'left' : 'right');
  const npc = NPCS.find((entry) => entry.id === scene.npc.id)!;
  const name = l(npc.name);
  const quest = questsForNpc(scene.npc.id)[0];
  const title = sceneId === 'village'
    ? { en: 'The Village', ar: 'القرية' }
    : { en: 'Masjid Courtyard', ar: 'ساحة المسجد' };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.focus({ preventScroll: true });
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewport({ x: width, y: height });
    });
    observer.observe(stage);
    const reset = () => keysRef.current.clear();
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);
    return () => {
      observer.disconnect();
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', reset);
    };
  }, []);

  const activate = useCallback(() => {
    if (talking) return;
    keysRef.current.clear();
    setTalking(true);
  }, [talking]);

  const onThreeProximity = useCallback((isNearby: boolean) => {
    setNearby(isNearby);
    if (!isNearby) setTalking(false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const draw = (dt: number) => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const key = keysRef.current;
      const input = mergeInput(keyboardInput(key), joystickRef.current, !talking, rtl);
      playerState.current = fixedSteps(playerState.current, input, dt, scene);
      const player = playerState.current;
      const isMoving = isPlayerMoving(player);
      if (isMoving !== wasMoving) {
        wasMoving = isMoving;
        setMoving(isMoving);
      }
      const close = inInteractionRange(player.position, scene.npc, INTERACTION_RADIUS);
      if (close !== wasNearby) {
        wasNearby = close;
        setNearby(close);
        if (!close) setTalking(false);
      }

      const playerPoint = renderPoint(player.position, scene, rtl);
      const target = cameraOffset(playerPoint, { x: width, y: height }, scene);
      const ease = reducedMotion ? 1 : 1 - Math.exp(-dt * 8);
      camera.current.x += (target.x - camera.current.x) * ease;
      camera.current.y += (target.y - camera.current.y) * ease;
      const cam = camera.current;
      context.clearRect(0, 0, width, height);
      const sky = context.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, sceneId === 'village' ? '#183457' : '#193e57');
      sky.addColorStop(1, sceneId === 'village' ? '#446c65' : '#437c76');
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);
      context.save();
      context.translate(-cam.x, -cam.y);
      context.fillStyle = sceneId === 'village' ? '#a9a47c' : '#c7b990';
      context.fillRect(0, 0, scene.width, scene.height);
      context.fillStyle = sceneId === 'village' ? '#c5b17c' : '#d6caa7';
      context.fillRect(0, 430, scene.width, 670);
      context.fillStyle = sceneId === 'village' ? '#dec693' : '#b3c5b6';
      context.fillRect(0, 605, scene.width, 150);
      context.globalAlpha = 0.24;
      context.fillStyle = '#fff4d6';
      for (let i = 0; i < 8; i++) context.fillRect(80 + i * 230, 625, 100, 3);
      context.globalAlpha = 1;

      if (sceneId === 'village') {
        for (const [x, width] of [[280, 400], [1140, 400]] as const) {
          const px = rtl ? scene.width - x - width : x;
          context.fillStyle = '#7b6047'; context.fillRect(px - 18, 235, width + 36, 74);
          context.fillStyle = '#d7b47a'; context.beginPath(); context.moveTo(px - 30, 240); context.lineTo(px + width / 2, 155); context.lineTo(px + width + 30, 240); context.closePath(); context.fill();
          context.fillStyle = '#c38b58'; context.fillRect(px, 305, width, 285);
          context.fillStyle = '#764a3c'; context.fillRect(px + width / 2 - 30, 438, 60, 152);
          context.fillStyle = '#e8d5a5'; context.fillRect(px + 34, 370, 52, 62);
          context.fillRect(px + width - 86, 370, 52, 62);
          context.fillStyle = '#9f704b'; context.fillRect(px + width / 2 - 5, 447, 10, 10);
        }
        // Shade trees have collision bodies around their trunks and low branches.
        for (const [x, y] of [[160, 460], [865, 420], [1600, 460]] as const) {
          const px = rtl ? scene.width - x : x;
          context.fillStyle = '#593f31'; context.fillRect(px - 12, y, 24, 92);
          context.fillStyle = '#34705a'; context.beginPath(); context.arc(px, y, 58, 0, Math.PI * 2); context.fill();
          context.fillStyle = '#4f8765'; context.beginPath(); context.arc(px - 12, y - 15, 38, 0, Math.PI * 2); context.fill();
        }
        const cartX = rtl ? scene.width - 1020 - 250 : 1020;
        context.fillStyle = '#805b3b'; context.fillRect(cartX + 18, 760, 214, 60);
        context.fillStyle = '#e0c68f'; context.fillRect(cartX + 28, 752, 194, 10);
        context.fillStyle = '#3e342a'; context.beginPath(); context.arc(cartX + 55, 825, 15, 0, Math.PI * 2); context.arc(cartX + 198, 825, 15, 0, Math.PI * 2); context.fill();
      } else {
        // Open courtyard arcades frame a clear central route to Yusuf and the fountain.
        for (const side of [0, 1]) {
          const x = side === 0 ? 180 : 1120;
          const px = rtl ? scene.width - x - 500 : x;
          context.fillStyle = '#eee4cd'; context.fillRect(px, 270, 500, 95);
          context.fillStyle = '#a99068'; context.fillRect(px, 255, 500, 16);
          for (let i = 0; i < 5; i++) {
            context.fillStyle = '#efe6d4'; context.fillRect(px + 22 + i * 104, 340, 34, 135);
            context.fillStyle = '#b49b72'; context.fillRect(px + 16 + i * 104, 330, 46, 16);
          }
        }
        const fountainX = rtl ? scene.width - 900 : 900;
        context.fillStyle = '#a78b60'; context.beginPath(); context.ellipse(fountainX, 690, 180, 86, 0, 0, Math.PI * 2); context.fill();
        context.fillStyle = '#3e9fa6'; context.beginPath(); context.ellipse(fountainX, 675, 146, 57, 0, 0, Math.PI * 2); context.fill();
        context.fillStyle = '#d8f0e5'; context.beginPath(); context.ellipse(fountainX - 35, 662, 36, 9, -0.2, 0, Math.PI * 2); context.fill();
        const benchX = rtl ? scene.width - 1150 - 240 : 1150;
        context.fillStyle = '#8c704f'; context.fillRect(benchX, 720, 240, 30);
        context.fillRect(benchX + 24, 750, 16, 52); context.fillRect(benchX + 200, 750, 16, 52);
      }
      if (import.meta.env.DEV) {
        context.strokeStyle = '#ff4d6d';
        context.lineWidth = 3;
        context.setLineDash([8, 7]);
        for (const rect of scene.obstacles) {
          const x = rtl ? scene.width - rect.x - rect.width : rect.x;
          context.strokeRect(x, rect.y, rect.width, rect.height);
        }
        context.setLineDash([]);
      }
      context.restore();

      const npcPoint = renderPoint(scene.npc, scene, rtl);
      const playerFacing = renderedFacing(player, rtl);
      if (playerFacing !== facingNow) {
        facingNow = playerFacing;
        setFacing(playerFacing);
      }
      if (playerRef.current) {
        playerRef.current.style.transform = `translate3d(${playerPoint.x - cam.x}px, ${playerPoint.y - cam.y}px, 0) translate(-50%, -91%)`;
        playerRef.current.style.zIndex = String(Math.round(playerPoint.y));
      }
      if (npcRef.current) {
        npcRef.current.style.transform = `translate3d(${npcPoint.x - cam.x}px, ${npcPoint.y - cam.y}px, 0) translate(-50%, -91%)`;
        npcRef.current.style.zIndex = String(Math.round(npcPoint.y));
      }
    };
    let facingNow: 'left' | 'right' = rtl ? 'left' : 'right';
    let wasNearby = false;
    let wasMoving = false;
    const stop = startGameLoop(draw);
    return () => {
      stop();
    };
  }, [scene, sceneId, rtl, reducedMotion, talking, viewport]);

  const keyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLElement && target !== event.currentTarget && (target.isContentEditable || ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(target.tagName))) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.code === 'KeyE' || event.code === 'Enter') {
      if (nearby) { event.preventDefault(); activate(); }
      return;
    }
    if (!talking) keysRef.current.add(event.code);
  };
  const keyUp = (event: React.KeyboardEvent<HTMLDivElement>) => keysRef.current.delete(event.code);
  const joystickDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (pointerRef.current !== null) return;
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    updateJoystick(event);
  };
  const updateJoystick = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) / 2;
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    joystickRef.current = joystickFromPointer({ x: 0, y: 0 }, { x: (event.clientX - center.x) / radius, y: (event.clientY - center.y) / radius });
    moveKnob(event.currentTarget, joystickRef.current, radius);
  };
  const releaseJoystick = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    pointerRef.current = null;
    joystickRef.current = { x: 0, y: 0 };
    moveKnob(event.currentTarget, joystickRef.current, 0);
  };

  return (
    <section className="play-world" aria-label={isRTL ? title.ar : title.en}>
      <div className="play-world__stage" ref={stageRef} tabIndex={0} role="application"
        aria-label={isRTL ? 'استخدم الأسهم أو WASD للتحرك. اقترب من الشخصية للتحدث.' : 'Use arrow keys or WASD to move. Approach the character to interact.'}
        onKeyDown={keyDown} onKeyUp={keyUp} onPointerDown={() => keysRef.current.clear()}>
        {use3D ? (
          <Suspense fallback={<div className="play-world__loading" role="status">{isRTL ? 'جارٍ تحميل القرية ثلاثية الأبعاد…' : 'Loading the 3D village…'}</div>}>
            <Village3D scene={scene} look={look} playerName={playerName} keys={keysRef} joystick={joystickRef} talking={talking} reducedMotion={reducedMotion} sprint={sprintRef} stageRef={stageRef} onNearby={onThreeProximity} onMoving={setMoving} />
          </Suspense>
        ) : (
          <>
            <canvas className="play-world__canvas" ref={canvasRef} aria-hidden="true" />
            <div className="play-world__actor" ref={npcRef} aria-hidden="true"><Character look={npc.look} size={68} facing={rtl ? 'left' : 'right'} pose={talking ? 'wave' : 'idle'} /></div>
            <div className="play-world__actor play-world__player" ref={playerRef} data-moving={moving}><Character look={look} size={70} facing={facing} walking={moving} expression="happy" title={playerName} /></div>
          </>
        )}
        <header className="play-world__header">
          <div><span className="play-world__eyebrow">SAJA · {isRTL ? 'استكشاف' : 'EXPLORATION'}</span><h1>{isRTL ? title.ar : title.en}</h1></div>
          <div className="play-world__header-actions">
            {can3D && <Button variant="ghost" size="sm" onClick={() => { setUse3D((current) => !current); setTalking(false); keysRef.current.clear(); }}>{use3D ? (isRTL ? 'الوضع ثنائي الأبعاد' : '2D mode') : (isRTL ? 'الوضع ثلاثي الأبعاد' : '3D mode')}</Button>}
            <Button variant="secondary" size="sm" icon="back" onClick={onExit}>{isRTL ? 'العودة إلى العالم' : 'Back to world'}</Button>
          </div>
        </header>
        <p className="play-world__help" aria-live="polite">{talking ? (isRTL ? 'الحركة متوقفة أثناء الحوار' : 'Movement pauses during conversation') : use3D ? (isRTL ? 'تحرّك بالأسهم أو WASD، واسحب لتغيير زاوية الرؤية. اضغط Shift للركض.' : 'Move with WASD or arrows. Drag to look; hold Shift to run.') : (isRTL ? 'تحرّك بالأسهم أو WASD، واقترب من الشخصية للتفاعل.' : 'Move with arrow keys or WASD. Approach the character to interact.')}</p>
        {nearby && !talking && <button className="play-world__prompt" onClick={activate}>{isRTL ? `تحدّث مع ${name}` : `Talk to ${name}`} <kbd>E</kbd></button>}
        {/* An NPC with a quest speaks through the quest (dialogue → clue hunt → mission); others use the short dialogue. */}
        {quest && <QuestRunner quest={quest} open={talking} onDismiss={() => setTalking(false)} />}
        {talking && !quest && <div className="play-world__dialog" role="dialog" aria-modal="false" aria-label={name}>
          <strong>{name}</strong><p>{l(npc.lines[line])}</p>
          <div className="play-world__dialog-actions">
            {line < npc.lines.length - 1 && <Button size="sm" onClick={() => setLine((value) => Math.min(npc.lines.length - 1, value + 1))}>{isRTL ? 'متابعة' : 'Continue'}</Button>}
            <Button size="sm" variant="secondary" onClick={() => { setTalking(false); navigate(`/mission/${scene.npc.missionId}`); }}>{isRTL ? 'ابدأ المهمة' : 'Start mission'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setTalking(false)}>{isRTL ? 'إغلاق' : 'Close'}</Button>
          </div>
        </div>}
        <div className="play-world__joystick" aria-label={isRTL ? 'عصا تحكم افتراضية' : 'Virtual movement joystick'} tabIndex={-1}
          onPointerDown={joystickDown} onPointerMove={updateJoystick} onPointerUp={releaseJoystick} onPointerCancel={releaseJoystick} onLostPointerCapture={releaseJoystick}>
          <span /><i aria-hidden="true">●</i>
        </div>
        {use3D && <button className="play-world__run" type="button" aria-label={isRTL ? 'الركض' : 'Run'} onPointerDown={(event) => { event.stopPropagation(); event.preventDefault(); sprintRef.current = true; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={(event) => { event.stopPropagation(); sprintRef.current = false; }} onPointerCancel={() => { sprintRef.current = false; }} onLostPointerCapture={() => { sprintRef.current = false; }}>{isRTL ? 'ركض' : 'Run'}</button>}
      </div>
    </section>
  );
}
