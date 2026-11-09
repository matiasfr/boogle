# Puzzle order: line 1 to Far Head

> **Status: proposed (2026-11-08).**

Seed: the owner's solo run to Far Head on an iPad (8 November, [playtests](../playtests.md)). They climbed Needle Bell
with the hook right after earning it and the sea switch did nothing; the cart's rack was invisible, so its logs seemed
to vanish; carried rails had to be dropped and re-picked; the wake needed several presses; they wanted a greeter who
says why you're here. Panel: three Codex panelists (design, systems, creative), two rounds each.

## Pitch

Every stage should change what you can do, and every hand-off should be visible. The first climb up Needle Bell should
do something you can see from the top: the sea gate drops and the lights run down to it, though Q5 is still built after
Q4 as now. Supplying a stretch and starting it become separate: you (or a friend) can stock a gated frame first, and it
visibly waits, full, for its switch. The material chain reads as one picture: cart, rack, your back, frame. A greeter at
the town gives the first purpose in one line and points up the path. Serves **Telegraph everything**, **Show, don't
tell** and **Enjoyable alone and together** (one stocks while the other climbs).

## Gut question

"Did climbing Needle Bell with my new hook help our railway, or feel like I'd gone the wrong way?"

- A, explain the wait: the switch stays locked until Q4, with a visible jam and a line saying why (what
  `sea-switch-early` builds today).
- B, reward the first climb (panel, unanimous): the summit pull opens the sea gate at once; Q5 still waits for Q4
  because stretches are built in order.
- C, remember the pull: an early pull stays set and the gate opens when Q4 completes (creative's first idea; all three
  dropped it in round 2 as one more unexplained state).

## Best suggestions

1. **Open the sea gate on the first summit pull** (all three lenses). The climb pays off on the spot; construction
   order is unchanged because only the active stretch takes material. Needs a rule change in `rail.seaSwitch`,
   `line2SeaOpen` and the `sea before Q4` invariant, plus the handle's pivot and end poses fixed.
2. **Separate supplying from starting** (systems, design). A gated frame takes logs and rails before its switch
   (owner call, being built as `gated-fill`); funding is checked when either the last material arrives or the gate
   opens, and starts exactly once. Show "materials ready, pull the switch" as a full frame held by a visible latch.
3. **One readable chain: cart, rack, pack, frame** (all three). The rack faces your approach and is unmistakable; rails
   ride on the pack; depositing visibly fills the frame; no drop-and-re-pick step. The rack stays (owner call: it can
   grow with upgrades). Fix the iPad render gap and the rail bug before judging whether more explanation is needed.
4. **Give each stage a distinct benefit** (design): T3 the walk home, the forge's first bill the pack, the lit forge
   rails and a better axe, Q2 vertical exploration, Q3 the quarry route, Q4 mixed deliveries, Q5 the sea crossing.
5. **Keep the greeter small** (systems, creative): one stationary worker, repeatable Talk, points up the real path;
   useful instruction first, gags second.

## Tensions

- **Early switch: open now or remember for later?** Creative first proposed an armed state; in round 2 every panelist
  preferred opening at once. Recommendation: B, open at once.
- **Explain more or show more?** Design and creative want composition (Portal-style staging) before any new text;
  systems allows a short in-world cue. Recommendation: fix visibility first, then add at most one short cue per state.

## Shape

Server kind for the rule (existing ops, no new kind, no saved field beyond `sea`); Local for the latch, cue, greeter
and handle. Smallest build: B's rule change plus the handle fix, on top of `gated-fill`, `depot-rack-carry`,
`sea-switch-early` (repurposed from the jam to the payoff) and `town-greeter`. Risk: the Q4 requirement lives in the
server rule, the read helper, the invariant and the Local target; change them together and prove early opening survives
a reload while Q5 funding stays blocked until Q4. No world reset needed if the invariant is only relaxed.

## Done means

- `look --rail-seed q2-done` (hook earned, Q4 not done), climb to the summit and pull: the handle rotates fully, the
  lights run down, the gate drops in the same capture; `inspect().line2.sea` true; Q5 deposits still refused (Q4 active).
- `--rail-seed q4-stocked` with the gate shut: frame full, latch visible, "materials ready" cue; pull, and laying
  starts once (server test for both orders and a near-simultaneous pair).
- Q2 cart arrival from the player's approach, desktop and iPad-like limits: rack and its logs visible, Pick up shown,
  rails visible on the pack frame after taking them, the frame's count rising on deposit.
- Fresh start: the greeter's line and pointing gesture at the town entrance; a single press wakes the machine.

## Open questions

1. **May the summit switch open the sea gate before Q4?** Recommended: yes (B); Q5 still waits for Q4.
   Answer: ___
2. **Should the "materials ready" state use a short text cue as well as the latch?** Recommended: yes, one line on the
   frame's sign, removed when laying starts. Answer: ___

## Parked

- A previz of the Q2 work site (cart, rack, frame from the approach) if the composition is still unclear after the fixes.
- Pacing beats for the switch: clank, travelling lights, distant gate, then quiet (after a yes).
- Friends splitting climbing and stocking as an explicit co-op moment.

## Disposition

Proceed within the current scope (owner, 8 Nov: brainstorm answers within this scope ship as the orchestrator's picks),
except question 1, which reverses an owner-approved B4 rule and needs the owner.
