> **Status: planned (2026-11-18), not built.** Decision: [cutscenes for everyone, 17 November](../decisions-rewards.md#d-2026-11-17-cutscenes-for-everyone)
> (the orchestrator's reading is still marked to confirm; open question 1). Backlog rows: "Cutscenes for everyone" and
> "The boiler-fitted cinematic" ([round-4-notes](round-4-notes.md) O18-5), folded in here. Base: `origin/main` at
> `ea3bc52a`. **No `WORLD_NS` bump**: no wire shape, op, catalog entry, saved room state or presence key changes
> (see Risks).

# Cutscenes for everyone

## Goal

When anyone in an online room gets a shared item or reaches a shared progression edge, every player in the room gets
the moment, not only the finder (owner, 17 November: "the shared progression is really earned if you're online").
Today every camera show already plays for everyone; what still splits is the **item cards** (the finder gets "You got",
friends a flourish) and the **boiler**, which has no show at all. This plan gives friends their own card, under the
safety rules, and builds the boiler's show once, for everyone.

Serves DESIGN.md **6, Communal world, personal things** (every upgrade applies to everyone, so everyone is told) and
**8, Enjoyable alone and together**. It bends nothing; it reverses the [co-op abilities option E](../brainstorms/coop-abilities.md)
split for players who are online, which the decision says it does.

**Research:** [third-person-camera](../research/third-person-camera.md): manual look has priority, so the boiler's
show is short (7 s) and skippable, like every pull-out. [progression-flow-layout](../research/progression-flow-layout.md),
lens "end a beat facing the next": the boiler's show ends on the breaker waiting at the forge, as Far Head's ends on
the boiler. [coop-abilities brief](../brainstorms/coop-abilities.md): its finding that the old all-pages card froze a
friend "mid-jump, mid-haul or on a train ... for a card about something that happened somewhere else" is why the
friend's card here waits until they are free. Playtests ([playtests.md](../playtests.md)): "Item cards need a button
press, so a new item has weight", and "Device cinematic goes only to whoever takes it: Matias got the island shot,
Grant didn't".

## Every reveal and show on a shared progression edge (19 today)

"Everyone" means every page in the room that sees the edge live. None of these plays on a reload, late join or resync
today. Line numbers are at `ea3bc52a`.

| # | Moment | Code | Who gets it today | This plan |
| --- | --- | --- | --- | --- |
| 1 | The "You got" card (the shared queue: holds input, frames Buddy, dismissed by Interact after 1.5 s) | `src/render/reward-reveal.ts:91` (`youGot`), `:117` (input hold), `:201` (camera) | The page that calls it: for a shared item, the finder only | Also called on friends' pages (step 1) |
| 2 | The friend's flourish (teal puff, notes, a small model over Buddy) | `src/entities/railway/ability-arrival.ts:247-259` (live), `:299-309` (late) | Friends, live; and anyone who was away, on their first landing | Live friends get the card instead; the late flourish stays (step 1) |
| 3 | Line 1: the track layer's wake | `src/entities/railway/view.ts:484-490` (`wake.start()` on the ignition edge) | Everyone, no camera | Unchanged |
| 4 | Line 1: the first path opens | `src/entities/railway/view.ts:582-585` (fanfare, whistle) | Everyone, no camera | Unchanged |
| 5 | The multi-axe (the wake's prize) | `src/entities/railway/reward.ts:257-262`, `:391-405` (handoff card); `ability-arrival.ts:61` (`atState` flourish) | Card: whoever pressed wake. Flourish: friends, as the wake ends | Friends: card as the wake ends (step 1) |
| 6 | The double jump | `src/entities/railway/tools.ts:192-203` (card); `ability-arrival.ts:58`; Home's trophy plinth (`trophy-plinth.ts:97`) | Card: finder. Flourish: friends. Plinth: each player as they pass | Friends: card (step 1); plinth unchanged |
| 7 | The hook | `src/entities/railway/line2-view.ts:874-887` (card, then the finder's demo pull) | Card and demo: finder. Flourish: friends | Friends: card, no demo (step 1) |
| 8 | The glider | `src/entities/railway/glide-device-view.ts:91-107` (`playSharedMoment('glider')`, no shot) | Card: finder. Flourish: friends | Friends: card (step 1) |
| 9 | The proper axe: the forge's cut | `src/entities/railway/line2-view.ts:1096-1117` (lit edge, `forgeCut('axe')`) | Everyone (the decision's first use) | Unchanged |
| 10 | The proper axe: its card | `tools.ts:173-176` | Card: opener. Flourish: friends | Friends: card (step 1) |
| 11 | The pack: the little guy's errand | `src/entities/railway/forge-rewards.ts` (live `line2PackReady` edge) | Everyone, no camera | Unchanged |
| 12 | The pack: its card | `tools.ts:178-189` | Card: opener. Flourish: friends | Friends: card (step 1) |
| 13 | The boiler: fit, train wake, halts | Clank `boiler-view.ts:569-575`; wake `train-view.ts:1102-1107`; halts `halts-view.ts:815-822`; card built off (`boiler-view.ts:40`, `:455-459`, `:477-479`); flourish `ability-arrival.ts:64-72` | Fit, wake and halts: everyone, no camera. Card: nobody (`BOILER_CARD = false`, copy awaiting the owner). Flourish: friends | A camera show for everyone (step 2); live friends' flourish replaced by it |
| 14 | Line 2: quarry lever and sea switch shots | `line2-view.ts:831`, `:871`, `showSwitch` `:147-160` | Everyone (`shared-moment.ts`) | Unchanged |
| 15 | Line 2: Q4's sea control install shot | `line2-view.ts:578-592`; `sea-gate-view.ts:205-216` | Everyone (state edge) | Unchanged |
| 16 | Line 2: Far Head's show (Q5), ending on the forge | `far-head-view.ts:106-130`; `line2-view.ts:1320` | Everyone (state edge); Act 2's card rides it | Unchanged |
| 17 | Line 2: the pier's show and its forge cut | `pier-view.ts:70-103` | Everyone (state edge) | Unchanged |
| 18 | Works throat, crossing finale, the Meet | `works-view.ts:824`, `:946`; `crossing-view.ts:513-562`; `ring-meet/view.ts:96`, `:242` | Everyone (`shared-moment.ts` or state edge) | Unchanged |
| 19 | Roundhouse installs (upgrade, longer boiler) | `roundhouse-view.ts:830-838` | Everyone; a banner when away, no shot | Unchanged |

Act cards (`src/features/acts.ts:88-98`) are per browser, not a progression edge of their own; they wait for any
full-screen moment (`momentBusy`).

So the split is in rows 5-8, 10, 12 and 13. Every camera show (rows 9 and 14-18) already plays for everyone.

## Design

### What a friend sees: their own card

**Recommendation:** when a friend's find is accepted, each other online player gets **their own "You got" card**, with
the same name, line and model as the finder's, held up over their own Buddy. The alternative is the finder's show seen
from the friend's own camera: a cut to the finder's avatar holding the item. It is rejected for four reasons:

- The finder's card frames the local Buddy (`frameBuddy`). Framing a remote avatar means a camera jump of up to a
  kilometre to a presence-lagged body that may not even be drawn.
- It tells the friend that someone else got the item, not that they can glide now. The card's line ("Open it in the
  air.", "Jump again in the air.") is the teach.
- It adds a second full-screen moment to the queue for every find.
- The owner's "really earned" reads as each player getting the item.

The copy is the existing card copy (`reward-data.ts`, `t1-reward-parts.ts`). This plan writes no new strings.

### Does it hold their input: yes, but only once they are free

**Recommendation:** the friend's card is the ordinary card. Buddy stands, turns to the camera, and Interact puts the
card away after 1.5 s; it gives an item its weight (playtests). It never interrupts. A friend's card is **owed** from
the accepted edge and comes up only on a frame where that player is **free**:

```
free = grounded (me.coyote > 0, not swimming) && !fallArrival.active
    && !inputState.seated          // a vehicle's seat
    && !seated()                   // a railway chair or bench (seat.ts): the card turns and holds Buddy
    && !railwayGlideOpen()         // never while gliding
    && !env.busy()                 // no card up or queued (reward-reveal's gettingItem)
    && !momentBusy()               // no shot, banner, act card or pause view on screen (buddy-frame.ts)
```

There is no time limit: a friend riding a train gets the card when they step off. The same `free` gate also guards the
existing late flourish, so a flourish never fires under a shot. Cards owed together come up one after another, one
per free frame, through the reveal's own FIFO.

### The safety rules, how each is enforced, and where the state lives

| Rule | Enforced by | State (sync kind) |
| --- | --- | --- |
| Queued behind a card | Cards: the reveal's FIFO (`reward-reveal.ts:91-99`) and `free`'s `env.busy()`. Shots: `createCameraPullOut`'s `waits` (`camera-pull-out.ts:189`), unchanged | Local, in memory |
| Never over a playing shot or another full-screen moment | `free`'s `momentBusy()` (cards and flourishes). Shots of different pull-out instances still do not wait for each other (existing; see Risks) | Local, in memory |
| Never while gliding | Cards: `free`'s `railwayGlideOpen()`. Shots: `waitShotsWhile` (`glide.ts`), unchanged | Local |
| Never seated | Cards: `free` waits for every seat (vehicle and chair). Shots: unchanged. A vehicle's seat gets none; a chair or bench rider gets the shot and comes back seated (owner, [14 November](../decisions-controls.md#d-2026-11-15-q4-gets-a-camera-shot)) | Local |
| None under reduced motion | Shots: `play` returns false (`camera-pull-out.ts:233`), unchanged. Cards: the card still comes up, still and without the camera move, exactly as the finder's does today (`reward-reveal.ts:202`) | Local |
| Never on a reload or late join | Cards for events: `adapter.onAccepted` fires only for live accepted events; a rebuilt packet replays none (`shared-moment.ts`'s contract). Cards for `atState` keys (multi-axe): only when the ability was watched going from missing to present on this page (`ability-arrival.ts:295`, `watched`). The boiler's show: the live `line2Trains` edge in `boiler-view.ts:475`, whose `restore()` (`:530`) sets `wasAwake` | Owed cards: Local, in memory, never saved. A reload before the card comes up drops it, and the player gets the existing late flourish on their next landing instead |
| Once per player | `seen` (`ability-arrival.ts:84`, `localStorage` `boogle.railway-seen.v0:<room>:<pid>`, same keys as today); the reveal's `shown` keys | Local, browser storage, unchanged format |

**Delivery** ([sync](../agents/sync.md)): every edge is an existing Server fact read through the railway adapter
(`onAccepted` receipts, or replicated rows read each frame). Nothing new is sent. No Owner presence, no message, no op,
no server code. The effects follow accepted receipts or replicated state, never `apply`
([room-safety](../agents/room-safety.md)). Friends see only confirmed events, never a prediction, so a refusal never
reaches them.

**Mixed builds** ([mixed-builds](../agents/mixed-builds.md)): no wire shape, op, catalog, saved room state or presence
key changes. The `seen` storage keeps its key and value format. **No `WORLD_NS` bump.**

### The boiler's show (O18-5): "now we have trains"

Trigger: the live `line2Trains` false→true edge. Both lines wake and the forge casts the breaker on that one server
tick (R1a; `place.md:541`), which can be well after the fit, once the depot cart rests. That is the moment "we have
trains". Every page in the room gets it, near or far, under the pull-out's rules. It lives on `line2-view.ts`'s
`switchCamera`, which already plays Far Head's, the pier's and the forge's cuts.

Its shape (starting numbers, settled by step 2's look):

1. **The old train wakes, 4.5 s.** From `LINE2_OLD_TRAIN` (1009.64, -149.0): the camera stands about 9 m off the
   loco's side and 3 m up, three-quarters to its front, looking at the chimney. It drifts back about 4 m and up 2 m
   through the existing wake presentation (`train-view.ts`'s `wake.start()`, 3.1 s): rust shedding, coughs, the steam
   burst at 1.95 s, the lamps at 2.35 s, the whistle. The halts drop in on the same edge (`halts-view.ts`); if one is
   in frame, it stays in.
2. **The forge cut, 2.5 s**, only if the breaker waits on the pedestal (`worksPreview() && works.breaker === 1`, the
   pier's condition, `pier-view.ts`): `end: forgeCut('breaker')`, the forge's call sounding as the cut lands, home
   facing the forge (`faceForge`). Otherwise the shot hands back behind Buddy at 4.5 s.

The forge's call is held for the show (`holdForgeCall`), as Far Head's is (`far-head-view.ts:114`). It sounds on the
cut, on the hand-back, or after `FIT.wake` when no shot was queued (reduced motion, a vehicle's seat): the timing it
has today. The playtest mark is `playMark('moment played', { moment: 'boiler trains', mine: false, shot, authority:
'local', edge: 'state' })`, the sea control's form (`sea-gate-view.ts:209`).

A friend whose page queued the show gets no boiler flourish (the show is their moment). A page with no shot (reduced
motion, a vehicle's seat) keeps the flourish, as today. The fitter's "Steam" card stays off until the owner answers
open question 2.

### Files

| File | Change |
| --- | --- |
| `src/entities/railway/ability-arrival.ts` | The `free()` gate; `owed: string[]` (Local); live friends' events and watched `atState` edges queue a card through `env.card(key)` and `env.youGot`, instead of the flourish; the late path keeps the flourish under `free()`; owed keys drop when the ability goes missing (the existing `gone > 3` branch); `markShown(key)` for the boiler's show; header comment rewritten for the new split |
| `src/entities/railway/reward.ts` | Passes `card: (key) => Got \| null` and `youGot: reveal.youGot` into `createAbilityArrival`; builds the glider's and the hook's friend card models (`GLIDE_REWARD` prize is here already; `HOOK_REWARD.parts` merged once); returns `markShown` |
| `src/entities/railway/tools.ts` | `cardFor(key)`: the same `Got` the finder's handler builds for `jump`, `axe`, `pack` and `multi-axe` (name, line, model; no `from`, no `handoff`); the finder's handlers unchanged |
| `src/entities/railway/shared-moment.ts`, `glide-device-view.ts`, `line2-view.ts:878`, `tools.ts:167` | Comments only: "only the finder gets the card" becomes "the finder's card on the press; friends' cards from ability-arrival.ts" |
| `src/entities/railway/boiler-shot.ts` (new, pure, layout only) | `boilerShot()`: `{ from, to, at, seconds: 4.5, drift }` metres from `LINE2_OLD_TRAIN`, and `BOILER_SHOW = { train: 4.5, hold: 30 }` |
| `src/entities/railway/boiler-view.ts` | Dep `shot: () => boolean` called on the live awake edge (`:475`); the forge-call hold moves to the show's closure when queued; the `moment played` mark |
| `src/entities/railway/line2-view.ts` | The boiler's `shot` closure: `switchKind = 'boiler'` (add to the union at `:131`), `switchCamera.play(...)` with an optional `end` forge cut, `onCut`/`onHome` sounding the call and `faceForge`; calls `markShown('boiler')` when queued; a new option `markShown` on `createRailwayLine2` |
| `src/entities/railway/view.ts` | Passes `reward.markShown` to `createRailwayLine2` |
| `docs/game-design/place.md` | "Shared abilities on the production railway" (`:421`), the hook demo line (`:736`), the glider line (`:781`), the boiler/trains beat (`:408`) and the fit (`:857`), each for what its step changes |

## Steps

Each step leaves `node dev/ship-check.ts` green, updates its `place.md` lines, and attaches its inspected still or clip
(`scripts/pr-shot.sh`). Looks use a disposable production room.

- [x] **1. A friend's own card for every shared item.** Files: `ability-arrival.ts`, `reward.ts`, `tools.ts`, the
  comment edits above, `place.md:421`, `:736`, `:781`. For a live accepted `rail.jump`, `rail.hook`, `rail.glide`,
  `rail.axe` or `rail.pack` from another pid: if `!seen.has(key)`, push `key` to `owed`; no flourish. For
  `multi-axe` (`atState`): when `watched.has(key)` and the state turns, push it to `owed`; the late path keeps its
  flourish. In `update`, on a `free()` frame, shift one owed key, call `env.youGot({ key, ...env.card(key)! })`, then
  `seen.add(key)` (and `'jump-taught'` for the jump, as the finder's handler does), with a `moment played` mark
  (`moment: '<key> card'`, `mine: false`, `edge: 'server'` or `'state'`). The hook's friend card has no `done`, so no
  demo pull. The finder's path is unchanged.
  **Done:** a friend on the ground gets the same card as the finder within a frame of the server's receipt. A friend
  gliding, seated, under a shot or behind another card gets it as soon as they are free. A late joiner or a reload gets
  the flourish and no card. Solo play is unchanged.
  **Check:** host tests in the existing `test/ability-arrival.test.ts` (its harness injects the imports, so add `seated`,
  `momentBusy` and the `env.card`/`env.youGot` fakes): a peer's `rail.glide` queues one card and no flourish; it waits
  while `railwayGlideOpen`, `seated`, `inputState.seated` or `momentBusy` holds; a new mount with that key seen shows
  nothing; a mount that never saw the event gets the late flourish and no card; the multi-axe card comes at the wake's
  end, not at the event. Update `a peer still gets the boiler flourish once, at the wake` only if step 1 changes it (it
  should not).
  **Look:** `npm run look -- --players 2 --eval dev/look/evals/coop-unlock.ts --query 'shot=play&coopShot=unlock&cardMs=20000' --seconds 6 --video`
  (the bot header's full command): the friend's page shows the jump card over their own Buddy after the finder takes
  the device. Then `coopShot=late`: the flourish on landing, no card.
  *Risk: medium (shared reward queue, two pages). Independent review: yes.*
  **Built (2026-11-18):** as written, with three changes. (a) `seat.ts` may not be imported here (lint
  `boogle/seats-from-records`), so the chair/bench check comes in as `env.seated`, through `reward.riderIs`, which
  `view.ts` feeds with `seats.seated` as it does `line2.riderIs` (one line in `view.ts`). (b) The wake's card is owed
  only on a page that heard the peer's `rail.wake` accepted live (`heard`), not merely watched the state turn, so a
  reload mid-wake gets the flourish and no card; that mark is kept until the state turns (the three-second fresh-start
  forgetting would otherwise drop it during the wait before the wake). (c) The first-jump teach also waits while a
  jump card is owed. The boiler keeps its flourish (no card). The look bot `dev/look/bots/coop-unlock.ts` now expects
  cards: it fails if a card comes up in the air or seated, puts away passing cards after `&cardMs=`, and has a new
  `coopShot=seated`. Tests: six new cases in `test/ability-arrival.test.ts`; the boiler cases unchanged.
  **Seen** (two players, `--warp-speed 2`, disposable look server):
  [seated](cutscenes-for-everyone/friend-card-seated.png): the friend sits on the track layer's chair through the
  wake and the jump find with no card; standing up, "You got the multi-axe!" / "Chops trees, breaks rocks, and more."
  comes up within about 0.1 s, Buddy turned to the camera. [unlock](cutscenes-for-everyone/friend-card-unlock.png):
  the find lands mid-hop; the jump card comes on landing, no flourish (Buddy faces away there because the bot's
  `straight()` walk rewrites the yaw every 40 ms, a harness artifact). [late](cutscenes-for-everyone/friend-card-late.png):
  offline for the find, the friend gets the teal flourish on landing, no card, and the first-jump pulse once.
  **After the independent review (2026-11-18):** "free" also waits while anything else holds input
  (`inputState.held`: a talk box, the garage panel or the fall; its only other writer is the reveal itself), so a card
  never comes up over a conversation and frees Buddy under it. A card the reveal refuses (a key it showed before a fresh
  start) leaves the flourish instead, with no card mark. A wake heard live is forgotten if the machine stops having
  begun waking for the three-second grace (a fresh start mid-wake), so a later restored wake gets the flourish, not a
  card; the wait asleep before a wake still keeps it. Which abilities have a card is a flag on each ability (`card`),
  so `owe()` builds nothing. The look bot checks each card as it is handed over, not only the first of a run of them,
  and puts away every card but the one a capture is about. Five review tests in `test/ability-arrival.test.ts`.
  The seated look rerun (`cardMs=1600`): the multi-axe card came up once the friend stood, and was put away; the friend
  was then back in the chair ("Stand up" showing) and the jump card waited, as it should while seated. What sat them
  back down is not known: the dismiss press cannot reach the chair (the reveal stops it in the capture phase), so
  probably a late seat-row correction after the bot's sit loop. Not chased; outside this step.
  **Not seen:** the jump card straight after the multi-axe card on a friend's page (both seated runs ended before it); a
  friend gliding when the card falls due (unit test only); the hook, glider, proper axe and pack
  cards on a friend's page (same code path, unit test covers the glider); the jump card after the multi-axe card in
  the seated run (the capture ended with the first card up); anything on a device.

- [x] **2. The boiler's show, for everyone.** Files: `boiler-shot.ts` (new), `boiler-view.ts`, `line2-view.ts`,
  `view.ts`, `ability-arrival.ts` (`markShown`), `place.md:408`, `:857`. As in "The boiler's show" above. The pull-out
  brings the existing rules (card queue, glide wait, vehicle seat, reduced motion, the 0.8 s Interact skip). Never on
  restore: `boiler-view.ts`'s `restore()` already sets `wasAwake`.
  **Done:** on the live trains edge, every page's camera frames the old train waking and, when the breaker waits, cuts
  to it at the forge as the call sounds, then comes home facing the forge. A friend whose page played it gets no boiler
  flourish. A reload, late join or resync plays nothing.
  **Check:** one case in `test/ability-arrival.test.ts`: `markShown('boiler')` before the trains edge leaves no
  flourish. The shot's numbers are proven by the look, not by a test.
  **Look:** `npm run look -- --rail-seed boiler-camp --players 2 --eval dev/look/evals/railway-boiler-fit.ts --until window.__boilerShot --seconds 12 --video --question "Does the friend's page cut to the old train waking, then to the breaker at the forge, and come home facing it?"`
  Also a still of the first frame of the cut, and one solo run under `?reducedMotion` (no shot; the forge call at its
  old time). The eval's existing PASS line for "one boiler flourish" changes to "no flourish, the show played".
  *Risk: medium (line2-view.ts hotspot, forge-call timing). Independent review: yes.*
  **Built (2026-11-18):** as written, with four changes. (a) The shot cuts in and cuts home (`back` 0.001 s), also when
  no breaker waits: a friend may be a kilometre off and a blend that far is a smear. (b) The numbers moved off the plan's
  first guess. The camera stands on the track's north (hill) side, not the south: from the south it stood on the halt's
  platform, and the halt dropping in on the same edge put its roof slab, sign and signal post across the foreground
  (looked at). Settled, in metres from the loco's middle (3.7 m east of `LINE2_OLD_TRAIN`; x along the track, z beside
  it, y over the ground under the loco): from (6, 2.6, -8), drifting to (9, 4.2, -11) over the 4.5 s leg, looking at
  (1.5, 2.6, 0), and never less than 1.6 m over the ground under the camera. The breaker's cut is `forgeCut('breaker')`
  unchanged; 7 s in all with it, 4.5 s without. (c) A resync (view.ts's soft rebuild) did not reach `boiler.restore()`,
  so a reconnect after the edge would have played the show: `line2.resynced()` now sets `wasAwake` there. (d)
  `reward.ts` forwards `arrival.markShown` (one line; it was in the Files table but not in this step's brief). If the
  queued shot is later dropped (a vehicle's seat taken while it waits or plays), the forge's call sounds at once (see
  the review note below for the flourish). The pull-out already waits while `inputState.held` is set and
  never writes it, so the show neither comes up over a talk box, the garage panel or the fall nor frees input under them.
  The eval's friend now checks the show (queued on the edge, past 4.6 s, home facing the forge, no card or hold, no
  flourish) and both pages log `BOILER SHOW HERE` (shot, when the call sounded). One new test in
  `test/ability-arrival.test.ts`.
  **Seen** (two players, `--warp-speed 2`): the friend's page cuts from the village to the loco (first frame:
  [train](cutscenes-for-everyone/boiler-show-train.png), the red loco three-quarters front, the first wisp over the
  chimney), the wake's dark coughs rise in a column, the halt's roof drops in behind the train and the little guys run
  in; 4.47 s later it cuts to the breaker lying on the pedestal under the crane's hook
  ([forge](cutscenes-for-everyone/boiler-show-forge.png)), and 2.5 s later home behind Buddy. The eval: longest 6.98 s,
  one forge turn, no flourish, `boiler` marked seen. Solo under `--reduced-motion`: no shot, the call 3.0 s after the
  trains edge, no camera cut in the clip. The fitter's "two little guys at the saddle before the wake ends" check fails
  on this branch and on `origin/main` alike (same command, 20 s capture), so it is not this step's (see below).
  **Not seen:** the show on a page with a card up or gliding at the edge (the pull-out's existing waits); a seat taken
  mid-show; the hand-back's turn toward the forge as a picture (the eval counts it); sound from the shot's camera (the
  clip is silent); a reload after the edge (restore sets `wasAwake`, read in code only); anything on a device.
  **After the independent review (2026-11-18):** (P2) a show that waited past its 30 s hold sounded the forge's call
  twice: once by itself as the hold ran out, again on the cut. The claim is now `createShowCall` (`boiler-shot.ts`):
  held for 30 s, cued once on the cut, the hand-back or a dropped shot, and at its deadline it lapses *without* a cue,
  because forge-call.ts sounds a held call by itself then and sounds it again on every later cue (the pier's
  reminder), so the review's "cue at the deadline" would still have sounded it twice (its test said 2 calls; 1 with the
  lapse). That test passed against the fix and was then dropped: docs/agents/tests.md keeps unit tests to lockstep code.
  (P3) The boiler's moment is no longer marked shown when the show is queued: `ability-arrival.ts` `showing(key,
  state)` holds the flourish back in memory while it is queued, spends it (`seen`) once the shot is on screen, and lets
  it come if the show is dropped unseen (a seat taken, another shot on the camera, a fresh start, a refused fit); a
  reload while queued forgets the hold, so the late flourish comes. (P3) A refused `rail.boilerFit` (the fitter's
  prediction) cancels a queued or playing boiler show and drops its claim; the real fit's edge plays it again. (P3) The
  eval asserts the forge's call sounds exactly once, at 4.5 s with a shot and 3.1 s without (0.6 s either way), on
  each page it runs, and traces the camp's little guys from the fit. Rerun (two players, `--warp-speed 2`): every
  friend check passed; the call sounded once, at 4.49 s on the friend's page and 4.55 s on the fitter's; the show ran
  6.91 s and came home facing the forge; no flourish.
  **The little guys' check is stale, not a defect of the show.** `train-view.ts` calls `folk.boltAt` from the
  accepted `rail.boilerFit`, at the fit; the bolt lasts 5 s (at least 2 after they arrive). The eval waits for
  `line2Trains` before checking, and that edge now comes once the depot cart rests: about 12 s after the press in
  every run (press frame 859, trains 1616; 855 and 1660 earlier). Solo, at the trains edge and 300 ms after it, three of
  camp 0's little guys were on 7 to 11 m from the saddle and `bolting()` was null: the bolt had come and gone. The
  check was not loosened; it wants its timing measured from the fit's acceptance (not this step's files).
  **Known, left as they are:** the forge leg is decided when the show is queued, not at the cut, so a breaker taken
  while the show waits still gets its cut (review P3-3); and every show shares one camera slot (`switchCamera` keeps
  one pending shot, so a later show replaces a queued one), which is older than this branch (review P3-4).

- [ ] **3. (Only if the owner says yes to open question 2.) The "Steam" card after the show, for every page.** File:
  `boiler-view.ts`: `BOILER_CARD = true`. The card is owed from the trains edge to every page (not only `fittedByMe`)
  and comes up through step 1's `free()` gate after the show's hand-back. Copy is the owner's: the 9 November words
  ("Steam" / "Trains run both lines.") or his rewrite. **Check:** ship-check. **Look:** step 2's clip, extended 4 s.
  *Risk: low.*

**Checkpoint** (after step 2): the full check, `npm run test:net`, and two proofs. First, `coop-unlock.ts` at
`coopShot=unlock` and `late`: a friend's card live, and a late flourish with no card. Second, `railway-boiler-fit.ts`
two-page: the show on the friend's page, not replayed after a reload. Nothing waits for a playtest.

## Level findings

The plan places nothing in the world: no prop, gate, secret or prompt moves. It adds one camera position near
`LINE2_OLD_TRAIN` and reuses `forgeCut('breaker')`. `npm run level-check` has nothing to check.

## Risks

- **Room safety:** no rule, apply, presence or transport change. Effects follow accepted receipts and replicated
  rows. Owed cards are never saved.
- **Hotspots:** `line2-view.ts` (1,400+ lines) and `boiler-view.ts`. The in-flight branch `claude/forge-rack-move`
  touches both, plus `works-view.ts` (open question 5).
- **Shot overlap (existing, not made worse):** each `createCameraPullOut` keeps one pending slot, and different
  instances (`switchCamera`, `throatCamera`, `finaleCamera`, the Meet's, the act's crane) do not wait for one another.
  The boiler's show goes on `switchCamera`, which also carries Far Head's, the pier's and the forge's cuts. None of
  those edges can fire within the same wait as the trains edge: Q5 comes before the boiler, and the pier's show needs
  the first train's kit. Friends' cards wait for `momentBusy()`, so they never send a playing shot back into the
  queue.
- **Audio from the shot:** the wake's sounds are positional (`chuff(x, z)`, `whistle`). Whether a far friend hears
  them from the shot's camera depends on where the listener sits. Unverified; step 2's clip checks it with sound on.
- **Performance:** no new meshes or lights per frame. One more merged geometry (the hook's friend card) is built once.
  No `npm run perf` needed.
- **Mixed builds:** none (see Design). No `WORLD_NS` bump.

## Open questions for the owner

1. **Confirm the reading:** "cutscenes for everyone" is a standing rule for every shared progression edge, and the
   existing item cards move to it now (this plan), for online players only. **Recommended: yes.**
2. **The boiler's "Steam" card** (decided 9 November, built off waiting on your words): should it come up after the
   show, for every page? **Recommended: yes, after the show, with your 9 November words or your rewrite** (step 3).
3. **The boiler's show ends on the breaker** waiting at the forge, as Far Head's ends on the boiler. Or should it
   stay on the trains? **Recommended: end on the breaker** when it waits; it is the next goal.
4. **A friend who was away** keeps the small flourish on their first landing, not a card, since nothing plays on a
   late join. **Recommended: keep the flourish.**
5. **Order with `claude/forge-rack-move`** (in flight; it edits `boiler-view.ts`, `line2-view.ts` and
   `works-view.ts`). **Recommended: step 1 now (it touches neither file), step 2 after that branch merges.**

## Design review (2026-11-18)

Run by the planner on its own plan, after rereading the plan from the top
([design-review](../../.claude/skills/design-review/SKILL.md)). Read: DESIGN.md; owner-calls (index, "Input gets
instant feedback", "Keep The Boogler's copy", "Build more, test less", "Port from Place only what still fits");
Current rules of [Rewards](../decisions-rewards.md#current-rules) and [Controls, HUD and arrival](../decisions-controls.md#current-rules),
with the entries cited below; [direction](../direction.md); [playtests](../playtests.md) (the item-card and cinematic
notes); context's design-work rules; the research named under Goal. Nothing is ported from Place. Place's "Shared
unlock arrival" (`place.md:419`) already gave partners their own card through the reward queue; this plan does the
same on the production railway, but behind `free()`, which Place never had.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Every shared progression edge plays for every online player, item gets included | Decided | [Rewards, 17 November](../decisions-rewards.md#d-2026-11-17-cutscenes-for-everyone); [Controls, 10 November](../decisions-controls.md#d-2026-11-10-shared-moments-play-for-everyone) |
| 2 | A friend sees their own card (same copy and model), not the finder's show from their camera | New | Recommended: own card (Design). Open question 1 |
| 3 | The friend's card holds input like the finder's (stand, Interact after 1.5 s) | New | Recommended: yes; "item cards need a button press" (playtests) |
| 4 | It comes up only when free: grounded, no glide, no seat of any kind, no card, no full-screen moment; no time limit | Default | The decision's safety rules; the coop-abilities freeze finding. Any seat, not only the vehicle seat, because the card turns and holds Buddy |
| 5 | Shots keep today's seat rule (chair and bench riders get them) | Decided | [Controls, 15 November](../decisions-controls.md#d-2026-11-15-q4-gets-a-camera-shot) (the 14 November rule restated) |
| 6 | Shots wait behind cards and while gliding, none under reduced motion, one Interact skip | Decided | [Controls, 9 and 15 November](../decisions-controls.md#d-2026-11-15-shots-wait-for-a-glider-to-land); [cinematic skip, 16 November](../decisions-controls.md#d-2026-11-16-batch2-controls-confirmed) |
| 7 | Under reduced motion a friend's card still comes up, still, as the finder's does | Default | The rule's "none" is about camera motion; the card has none under reduced motion |
| 8 | Never on a reload or late join; a friend who was away gets the late flourish instead | Decided (the rule); Default (keeping the flourish) | Rule: the 17 November entry. Keeping option E's late flourish: open question 4 |
| 9 | A reload before an owed card comes up drops it; the late flourish covers it | Default | Owed cards are never saved (no new storage) |
| 10 | The hook's friend card has no demo pull | Default | The demo moves the finder from the ring's spot (`place.md:736`); a friend is elsewhere |
| 11 | A friend's jump card counts as the jump teach, as the finder's does | Default | `ability-arrival.ts:254` |
| 12 | The boiler's show triggers on the trains edge (both lines wake), not the fit press | Default | The owner's "show that now we have trains"; the fit press keeps its instant clank (owner call "Input gets instant feedback") |
| 13 | The boiler's show: 4.5 s on the waking train, then a 2.5 s forge cut to the breaker when it waits; 7 s in all | Default (numbers); New (ending on the breaker) | Pier and Far Head precedent; research lens "end a beat facing the next". Open question 3 |
| 14 | A friend whose page played the boiler's show gets no boiler flourish | Default | One moment, not two |
| 15 | The fitter's "Steam" card stays off; if turned on, it comes up for every page | Decided (the card); New (every page) | [Controls, 9 November](../decisions-controls.md#d-2026-11-09-four-more-answers); built off for his words. Open question 2 |
| 16 | Act cards, the plinth, the pack errand, the forge cut and the line 1 shows are unchanged | Default | Already everyone's, or per player by design |

Counts: **Decided 5** (1, 5, 6, 8's rule, 15's card), **Default 10** (4, 7, 8's flourish, 9, 10, 11, 12, 13's
numbers, 14, 16), **New 4** (2, 3, 13's ending, 15's every page).

### Findings

1. **Line 1's first path opening has no camera** (row 4). Place's version has a pull-out and "A way across!"
   (`place.md:401`). It already plays for everyone, so it meets the decision, and adding a shot would be a new show.
   No step changes; noted for the owner, not asked.
2. **A friend's card over a playing shot would replay that shot whole** (`camera-pull-out.ts:200-203`: a card sends a
   playing shot back to the queue). This changed step 1: `free()` includes `momentBusy()`.
3. **"Seated" means two things.** The backlog row says "never while gliding or seated", and the 14 November rule plays
   shots for chair riders. Both stand: shots keep the 14 November rule, and cards wait for every seat. Recorded as
   call 4; no step changed beyond step 1's gate.
4. **The co-op version:** two friends on the ground both get the card at once, each on their own page. That is the
   point (the plinth's "together" show is unchanged). The solo version is unchanged: the finder is the only page.
   A friend arriving late gets the flourish (call 8). No finding against the plan.
5. **Flow:** nothing is placed or gated, so the route's legs are unchanged. The boiler's show ends facing the breaker,
   which is the next goal (rule 1, "the next goal can be found"). No reach claim to prove.

### Owner questions

The five open questions above, each with its recommendation.
