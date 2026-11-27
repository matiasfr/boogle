// Owned phase-guide behaviour (docs/brainstorms/phase-guides.md): shared by Sleeves (greeter.ts), the forge foreman
// (forge-guide.ts), Ring Island's Hooter (ring-folk/view.ts), and the station guides (station-guides.ts).
// Drives `…` unread cue (speech-cue/view.ts), Talk card (place/talk.ts), optional once-per-stage approach bark
// (place/chatter.ts), and optional waving / pointing / chat facing on a `place/folk.ts` body.
// Local presentation over accepted server state; no sim writes, wire fields or saved state.
import { Vector3 } from 'three/webgpu';
import { angleLerp } from '../../math.ts';
import type { Guy } from '../../place/folk.ts';
import type { Who } from '../../place/talk.ts';
import { conversation } from '../../player/conversation.ts';
import { NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { inputState } from '../../player/input-state.ts';
import { me } from '../../player/player.ts';
import { momentBusy } from '../../render/buddy-frame.ts';
import type { VoiceSpec } from '../../render/npc-voice.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { toScreen, view } from '../../render/scene.ts';
import { createSpeechCue } from '../speech-cue/view.ts';
import type { GuideLines } from './stages.ts';

/** Metres: Talk reach (Sleeves' and foreman's), approach bark range; seconds a bark holds. */
export const PHASE_GUIDE = { talk: 3.3, bark: 10, wave: 8, barkMin: 2.6, barkMax: 6, perWord: 0.34 } as const;

export type PhaseGuideOptions<S extends string> = {
  /** Stable interactable id (e.g. 'railway-talk-foreman'). */
  id: string;
  /** Role label or character name shown on the talk card. */
  name: string;
  /** Coat colour used on the talk card accent. */
  color: string;
  voice: VoiceSpec;
  /** The little guy's body once the folk kit has loaded. */
  body: () => Guy | null;
  /** Current stage derived from accepted server state, or null when inactive. */
  stage: () => S | null;
  /** Lines per stage (talk lines, optional approach bark, optional idle flag). */
  lines: Record<S, GuideLines>;
  /** Session ready check (e.g. `adapter.read.ready()`). */
  ready: () => boolean;
  /** Optional visibility/residency predicate (default true). */
  active?: () => boolean;
  /** Enable once-per-stage approach bark within 10 m (only at proven stall points). */
  bark?: boolean;
  /** Optional world target to point at while in stage `s`. */
  aim?: (stage: S) => { x: number; z: number } | null;
  /** Range (m) within which the guide waves or points (default 8 m). */
  waveRange?: number;
  /** When true (default), this helper sets `g.mood` and `g.yaw` while idle/waving/pointing/talking. When false, the
   * caller owns non-talking pose and this helper only drives `point` (when `aim` returns a target) and `chat`. */
  driveBody?: boolean;
  /** Rest yaw (radians) when `driveBody` is true and nobody is near or pointing. */
  restYaw?: number;
};

export function createPhaseGuide<S extends string>(owner: OwnedView, opts: PhaseGuideOptions<S>) {
  let talk: typeof import('../../place/talk.ts') | null = null;
  let chatter: typeof import('../../place/chatter.ts') | null = null;
  const load = opts.bark
    ? Promise.all([import('../../place/talk.ts'), import('../../place/chatter.ts')]).then(([t, c]) => {
        if (!owner.alive) return;
        talk = t;
        chatter = c;
      })
    : import('../../place/talk.ts').then((t) => {
        if (!owner.alive) return;
        talk = t;
      });
  void load;

  const at = new Vector3();
  const head = new Vector3();
  const cue = createSpeechCue(owner, at);
  let bubble: HTMLDivElement | null = null;
  if (opts.bark) {
    bubble = document.createElement('div');
    bubble.className = 'place-bark';
    (document.querySelector('.hud') ?? document.body).append(bubble);
  }
  const screen = { x: 0, y: 0, behind: false };

  let cur: S | null = null;
  let cursor = 0;
  let who: Who | null = null;
  let barking: Guy | null = null;
  let barkLeft = 0;
  let lineNo = 0;
  const barked = new Set<S>();

  const waveRange = opts.waveRange ?? PHASE_GUIDE.wave;
  const driveBody = opts.driveBody ?? true;
  const isActive = () => opts.active?.() ?? true;
  // Anything else holding input (a card, a show, the garage, the fall, another talk) or a moment on screen.
  const quiet = () => inputState.held || conversation.open || momentBusy();
  const speaking = () => !!who && talk?.talking() === who;
  const specOf = (s: S | null): GuideLines | null => (s ? opts.lines[s] : null);
  const unread = () => {
    const spec = specOf(cur);
    return !!spec && !spec.idle && cursor < spec.talk.length;
  };

  function stopBark() {
    if (!barking) return;
    barking.chat = 0;
    barking = null;
    bubble?.classList.remove('on');
  }
  function startBark(g: Guy, text: string) {
    if (!bubble) return;
    barking = g;
    g.chat = 1;
    barkLeft = Math.min(
      PHASE_GUIDE.barkMax,
      Math.max(PHASE_GUIDE.barkMin, text.split(/\s+/).length * PHASE_GUIDE.perWord),
    );
    bubble.textContent = text;
    chatter?.babble(lineNo++, g.k, g.x, g.z);
  }
  function open() {
    const g = opts.body();
    const spec = specOf(cur);
    if (!talk || !g || !cur || !spec || !spec.talk.length || quiet() || !isActive()) return;
    if (!who) who = { name: opts.name, voice: opts.voice, x: g.x, z: g.z, color: opts.color };
    else {
      who.x = g.x;
      who.z = g.z;
    }
    const line = spec.talk[cursor % spec.talk.length]!;
    if (!talk.startTalk(who, { say: line, answers: [{ label: 'Bye', then: () => null }] })) return;
    cursor++;
    stopBark();
  }

  owner.cleanup(() => {
    if (speaking()) talk?.endTalk();
    stopBark();
    bubble?.remove();
  });

  const near: Interactable[] = [{ id: opts.id, verb: 'Talk', at, run: open, show: cue.show }];

  return {
    speaking,
    update(dt: number) {
      const active = isActive();
      const ready = opts.ready();
      const s = !active ? null : ready ? opts.stage() : cur;
      if (s !== cur) {
        cur = s;
        cursor = 0;
        stopBark();
      }
      const g = opts.body();
      if (!g || !cur) {
        if (speaking()) talk?.updateTalkCard();
        return;
      }
      at.set(g.x, (g.fy ?? g.y) + 1.5, g.z);
      const p = me.body?.position;
      const d = p ? Math.hypot(p.x - g.x, p.z - g.z) : Infinity;
      const spec = opts.lines[cur];
      const aim = opts.aim?.(cur) ?? null;
      const isTalking = speaking();
      const turn = Math.min(1, dt * 5);

      if (aim) {
        g.on = true;
        g.mood = d <= waveRange ? 'point' : 'idle';
        if (!isTalking) g.yaw = angleLerp(g.yaw, Math.atan2(aim.x - g.x, aim.z - g.z), turn);
      } else if (driveBody) {
        if (p && d <= waveRange) {
          g.yaw = angleLerp(g.yaw, Math.atan2(p.x - g.x, p.z - g.z), turn);
          g.mood = isTalking ? 'chat' : spec.idle ? 'idle' : 'wave';
        } else {
          g.mood = 'idle';
          if (opts.restYaw !== undefined) g.yaw = angleLerp(g.yaw, opts.restYaw, turn);
        }
      }
      if (isTalking) {
        g.mood = 'chat';
        if (p) g.yaw = angleLerp(g.yaw, Math.atan2(p.x - g.x, p.z - g.z), turn);
      }

      if (opts.bark) {
        if (barking) {
          barkLeft -= dt;
          if (barkLeft <= 0 || quiet() || !g.on || d > PHASE_GUIDE.bark * 2) stopBark();
        } else if (ready && g.on && spec.bark && !spec.idle && !barked.has(cur) && d <= PHASE_GUIDE.bark && !quiet()) {
          barked.add(cur);
          startBark(g, spec.bark);
        }
      }
      if (isTalking) talk?.updateTalkCard();
    },
    /** After prompts and camera. */
    lateUpdate() {
      const g = opts.body();
      cue.update(!!g?.on && isActive() && unread() && opts.ready() && !quiet());
      if (!barking || !bubble) return;
      toScreen(head.copy(at).setY(at.y + 0.55), screen);
      const shown = !screen.behind && screen.x > 0 && screen.x < view.w && screen.y > 0 && screen.y < view.h;
      bubble.classList.toggle('on', shown);
      if (shown)
        bubble.style.transform = `translate(-50%, -100%) translate(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px)`;
    },
    targets(): Interactable[] {
      const g = opts.body();
      const p = me.body?.position;
      if (!g?.on || !cur || !p || !isActive()) return NO_TARGETS;
      if (Math.hypot(p.x - g.x, p.z - g.z) > PHASE_GUIDE.talk || Math.abs(p.y - (g.fy ?? g.y)) > 3) return NO_TARGETS;
      return opts.ready() && !quiet() ? near : NO_TARGETS;
    },
    inspect: () => {
      const g = opts.body();
      return {
        stage: cur,
        on: !!g?.on,
        mood: g?.mood ?? null,
        x: g?.x ?? 0,
        z: g?.z ?? 0,
        unread: unread(),
        heard: cursor,
        barked: [...barked],
        barking: barking ? (bubble?.textContent ?? '') : null,
        speaking: speaking(),
      };
    },
  };
}
