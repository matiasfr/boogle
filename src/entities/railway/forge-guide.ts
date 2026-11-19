// The forge crew's foreman (docs/brainstorms/boiler-guide.md; owner, 18 November 2026, "The forge crew's foreman",
// docs/decisions-characters.md#d-2026-11-18-decisions-page-characters): the middle of the three little guys at the
// pedestal (part-hoist.ts) says what the waiting part is for and where it goes. On first coming within GUIDE.bark of him
// in a stage he says one line in a bubble; within GUIDE.talk Interact offers Talk through the shared talk card, his `…`
// marking lines still unheard in this stage (owner call "One NPC bubble"). Both wait while anything holds the input or a
// moment has the screen. Once the part is taken the other two go back in, and he stays until the first seam is struck,
// pointing the way: to the old train while the boiler is out, to the Roundhouse slab's seam once the breaker is out.
// Local presentation over accepted state: the stage is read from the railway rows each frame, so
// a reload, a late join or a `?from=` jump finds him on the current thing; nothing is sent or saved.
import * as THREE from 'three/webgpu';
import { createSpeechCue } from '../../components/speech-cue/view.ts';
import { conversation } from '../../player/conversation.ts';
import { NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { inputState } from '../../player/input-state.ts';
import { me } from '../../player/player.ts';
import { momentBusy } from '../../render/buddy-frame.ts';
import { folkVoice } from '../../render/npc-voice.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { toScreen, view } from '../../render/scene.ts';
import { boiler as boilerRow, works as worksRow, type ReadWorld } from '../../sim/railway-rows.ts';
import { LINE2_OLD_TRAIN } from '../../sim/railway-line2-layout.ts';
import { WORKS_SEAMS } from '../../sim/railway-works-layout.ts';
import { SEAM_STALL, SEAM_THROAT } from '../../sim/railway-works.ts';
import type { Guy } from '../../place/folk.ts';
import { FOREMAN, HOIST } from './part-hoist.ts';

export type GuideStage = 'boiler' | 'held' | 'breaker' | 'seam';
/** What he says, by stage. Every word is the owner's: each placeholder says what its line must tell. `bark` is said once
 * a stage in a bubble as you come near; `talk` turns over on each Talk. */
export const FOREMAN_LINES: Record<GuideStage, { bark: string; talk: readonly string[] }> = {
  boiler: {
    bark: "owner's line: the boiler is for the old train",
    talk: [
      "owner's line: what the boiler is for, and that it goes to the old train",
      "owner's line: it is slow to drag alone, and a friend can help carry it",
    ],
  },
  held: {
    bark: "owner's line: the old train is that way",
    talk: ["owner's line: which way the old train is, and that the boiler fits in its saddle"],
  },
  breaker: {
    bark: "owner's line: the breaker opens the Works",
    talk: [
      "owner's line: what the breaker is for, and that the Works is next",
      "owner's line: the trains now carry Q6's goods",
    ],
  },
  seam: {
    bark: "owner's line: where the first seam is",
    talk: ["owner's line: where the first seam is, and that the breaker strikes it"],
  },
};
/** Where he points in the stages after the take, in metres: the old train's saddle, then the nearer seam (the
 * Roundhouse slab's, 34 m off; the cut's throat is 200 m on). */
const AIM: Partial<Record<GuideStage, { x: number; z: number }>> = {
  held: { x: LINE2_OLD_TRAIN.x / 100, z: LINE2_OLD_TRAIN.z / 100 },
  seam: { x: WORKS_SEAMS[0].x / 100, z: WORKS_SEAMS[0].z / 100 },
};
/** A placeholder for the owner's name for him: his role, as the camp's "Camp resident" is. */
export const FOREMAN_NAME = 'Foreman';
/** Metres: Talk's reach (Sleeves'), the bubble's first-approach range; seconds a bubble holds (the residents' barks). */
export const GUIDE = { talk: 3.3, bark: 10, barkMin: 2.6, barkMax: 6, perWord: 0.34 } as const;

/** Which stage he is in, from accepted state: null when the pedestal has nothing for him to talk about. */
export function guideStage(w: ReadWorld, worksOn: boolean): GuideStage | null {
  const boiler = boilerRow(w).state;
  if (boiler === 'pedestal') return 'boiler';
  if (boiler === 'held' || boiler === 'ground') return 'held';
  if (!worksOn) return null;
  const works = worksRow(w);
  if (works.breaker === 1) return 'breaker';
  return works.breaker === 2 && !(works.seams & (SEAM_STALL | SEAM_THROAT)) ? 'seam' : null;
}

type Deps = {
  /** His body, once the folk kit has loaded (part-hoist.ts). */
  body: () => Guy | null;
  stage: () => GuideStage | null;
  ready: () => boolean;
};
const VOICE = folkVoice(200, 26, 0.95, 3000);

export function createForgeGuide(owner: OwnedView, { body, stage, ready }: Deps) {
  let talk: typeof import('../../place/talk.ts') | null = null,
    chatter: typeof import('../../place/chatter.ts') | null = null;
  void Promise.all([import('../../place/talk.ts'), import('../../place/chatter.ts')]).then(([t, c]) => {
    if (!owner.alive) return;
    talk = t;
    chatter = c;
  });
  const at = new THREE.Vector3(),
    head = new THREE.Vector3();
  const cue = createSpeechCue(owner, at);
  const bubble = document.createElement('div');
  bubble.className = 'place-bark';
  (document.querySelector('.hud') ?? document.body).append(bubble);
  const screen = { x: 0, y: 0, behind: false };
  let cur: GuideStage | null = null,
    cursor = 0,
    speaking = false,
    barking: Guy | null = null,
    barkLeft = 0,
    lineNo = 0;
  const barked = new Set<GuideStage>();
  // Anything else holding the input (a card, a show, the garage, the fall, another talk) or a moment on screen.
  const quiet = () => inputState.held || conversation.open || momentBusy();
  function stopBark() {
    if (!barking) return;
    barking.chat = 0;
    barking = null;
    bubble.classList.remove('on');
  }
  function bark(g: Guy, text: string) {
    barking = g;
    g.chat = 1;
    barkLeft = Math.min(GUIDE.barkMax, Math.max(GUIDE.barkMin, text.split(/\s+/).length * GUIDE.perWord));
    bubble.textContent = text;
    chatter?.babble(lineNo++, g.k, g.x, g.z);
  }
  function open() {
    const g = body();
    if (!talk || !g || !cur || quiet()) return;
    const lines = FOREMAN_LINES[cur].talk;
    const started = talk.startTalk(
      { name: FOREMAN_NAME, voice: VOICE, x: g.x, z: g.z, color: FOREMAN.coat },
      { say: lines[cursor % lines.length]!, answers: [{ label: 'Bye', then: () => null }] },
      () => {
        speaking = false;
      },
    );
    if (!started) return;
    speaking = true;
    cursor++;
    stopBark();
  }
  owner.cleanup(() => {
    if (speaking) talk?.endTalk();
    stopBark();
    bubble.remove();
  });
  const unread = () => !!cur && cursor < FOREMAN_LINES[cur].talk.length;
  return {
    /** After the hoist's update, which faces and waves the three. */
    update(dt: number) {
      const s = ready() ? stage() : null;
      if (s !== cur) {
        cur = s;
        cursor = 0;
        stopBark();
      }
      const g = body();
      if (!g || !cur) return;
      at.set(g.x, (g.fy ?? g.y) + 1.5, g.z);
      const p = me.body?.position,
        d = p ? Math.hypot(p.x - g.x, p.z - g.z) : Infinity;
      // No part on the pedestal: the hoist has sent the three in; he stays and points the way for whoever is near.
      const aim = AIM[cur];
      if (aim) {
        g.on = true;
        g.mood = d <= HOIST.wave ? 'point' : 'idle';
        g.yaw = Math.atan2(aim.x - g.x, aim.z - g.z);
      }
      if (speaking) {
        g.mood = 'chat';
        if (p) g.yaw = Math.atan2(p.x - g.x, p.z - g.z);
      }
      if (barking) {
        barkLeft -= dt;
        if (barkLeft <= 0 || quiet() || !g.on || d > GUIDE.bark * 2) stopBark();
      } else if (g.on && !barked.has(cur) && d <= GUIDE.bark && !quiet()) {
        barked.add(cur);
        bark(g, FOREMAN_LINES[cur].bark);
      }
      if (speaking) talk?.updateTalkCard();
    },
    /** After the prompts and the camera. */
    lateUpdate() {
      const g = body();
      cue.update(!!g?.on && ready() && !quiet() && unread());
      if (!barking) return;
      toScreen(head.copy(at).setY(at.y + 0.55), screen);
      const shown = !screen.behind && screen.x > 0 && screen.x < view.w && screen.y > 0 && screen.y < view.h;
      bubble.classList.toggle('on', shown);
      if (shown)
        bubble.style.transform = `translate(-50%, -100%) translate(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px)`;
    },
    targets(): Interactable[] {
      const g = body(),
        p = me.body?.position;
      if (!g?.on || !cur || !p || !ready() || quiet()) return NO_TARGETS;
      if (Math.hypot(p.x - g.x, p.z - g.z) > GUIDE.talk || Math.abs(p.y - (g.fy ?? g.y)) > 3) return NO_TARGETS;
      return [{ id: 'railway-talk-foreman', verb: 'Talk', at, run: open, show: cue.show }];
    },
    inspect: () => {
      const g = body();
      return {
        stage: cur,
        on: !!g?.on,
        mood: g?.mood ?? null,
        x: g?.x ?? 0,
        z: g?.z ?? 0,
        unread: unread(),
        heard: cursor,
        barked: [...barked],
        barking: barking ? (bubble.textContent ?? '') : null,
        speaking,
      };
    },
  };
}
