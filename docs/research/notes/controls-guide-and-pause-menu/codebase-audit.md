# Controls guide, pause view and HUD/prompt UI in Boogle: codebase audit (as of 266cf32, 2026-10-29)

Sources are files in the repo; links are repo-relative paths with line numbers. Nothing was run in a browser; layout claims about overlap are inferences from CSS values.

## 1. Where the controls guide and pause view live, how they open/close, and what happens to play while open

### Takeaway
There is **no pause view at all**. "The controls guide" is really three separate things: (a) a static keyboard/mouse help panel in `index.html` bottom-left, toggled with H, shown only on desktop non-gamepad; (b) a gamepad-only `.pad-card` built from the action registry, toggled with Menu; (c) nothing on touch. The world never pauses (physics, presence and lockstep keep running); the only true modal is The Boogler's talk box, and the de facto "pause" on keyboard/mouse is the browser's Esc releasing pointer lock.

### Cited Findings
**No pause.**
- A grep for `pause|menu|help|guide` over `src/` and `index.html` finds no pause state, pause menu or settings screen; the only hits are the help panel, the pad card and the dialogue modal — [grep over src/, index.html]
- Physics is never paused even for hit-stop: "freezes the ball mesh and your avatar's animation; physics never pauses" — [src/features/impact.js:3](src/features/impact.js)
- The frame loop runs unconditionally each rAF: `world.step(FIXED, dt, 4)`, all `runFrame` phases, `sendPresence()` every `SEND_MS`, render — [src/main.js:90-113](src/main.js)
- Only `document.hidden` (tab hidden) causes a release: `releaseAll(); me.charging = false; releaseBall();` then `sendPresence()` — [src/input.js:252-259](src/input.js)

**(a) Keyboard/mouse help panel `#help`.**
- Static markup: `<div class="help" id="help">` with 10 rows of `<kbd>` + `<span>` (WASD Move, Space Jump/swim up, Shift Sprint, Click "Use what you hold (empty hands: same as E)", Hold "Charge, release to throw", R ball back, F shovel, Click "Shovel: dig (hold to repeat)", Right click "Shovel: pile up sand", H "Hide these controls") — [index.html:35-46](index.html)
- Styles: `.help` absolutely positioned bottom-left with safe-area insets, `display:none` by default, glass background, 13px/600 text — [src/style.css:162-186](src/style.css); shown only via `body.playing:not(.touch):not(.help-hidden) .help { display: flex; }` — [src/style.css:201-203](src/style.css)
- Hidden while a gamepad is active: `body.gamepad .help { display: none !important; }` — [src/features/gamepad.css:8-10](src/features/gamepad.css)
- Toggle: `if (e.code === 'KeyH') document.body.classList.toggle('help-hidden');` inside the general keydown handler (so only after `me.entered` and not while typing in the name box) — [src/input.js:39-56](src/input.js)
- The hidden state is not persisted: no `localStorage` use in input.js, gamepad.js or style.css (grep) — [src/input.js](src/input.js); so the panel reappears every page load.
- It is always on screen while playing by default (opt-out, not opt-in); `body.playing` is added once on entering the island — [src/player.js:79](src/player.js)

**(b) Gamepad layout card `.pad-card`.**
- Created in `onStart`, appended to `.hud`, `hidden = true` — [src/features/gamepad.js:138-142](src/features/gamepad.js)
- `showCard()` rebuilds rows from `['Left stick','Move'], ['Right stick','Look'], ...listActions().map((a) => [PAD_LABEL[a.pad], a.label])` as plain `<kbd>` text — [src/features/gamepad.js:59-79](src/features/gamepad.js)
- Opened automatically for 6 s the first time a pad becomes active (`showCard(true); setTimeout(() => showCard(false), 6000)`), then toggled by Menu: `registerAction('pad-help', { pad: 'menu', label: 'Show / hide this list', down: () => showCard() })` — [src/features/gamepad.js:41-45](src/features/gamepad.js), [src/features/gamepad.js:136](src/features/gamepad.js)
- Centered fixed card, `pointer-events: none`, glass background; `kbd` min-width 70px — [src/features/gamepad.css:11-36](src/features/gamepad.css)
- Gameplay keeps running while the card is up: the poll loop still dispatches every pad action and stick each frame; the card does not set a pad modal — [src/features/gamepad.js:121-133](src/features/gamepad.js)

**(c) Touch.**
- The help panel is excluded on touch (`:not(.touch)`) — [src/style.css:201](src/style.css); the pad card is only reachable via the pad Menu button — [src/features/gamepad.js:136](src/features/gamepad.js). Touch players get no list of controls; the buttons carry their own text labels ("Jump", "Grab", "Shovel", "Honk", ...) — [index.html:49-56](index.html), [src/features/honk.js:297-305](src/features/honk.js)
- Touch is detected once at load: `export const isTouch = matchMedia('(pointer: coarse)').matches;` — [src/constants.js:33](src/constants.js); `if (isTouch) document.body.classList.add('touch');` — [src/input.js:30](src/input.js)

**The one real modal: The Boogler's talk box.**
- Header: "While it is open it swallows game keys and clicks, takes the gamepad, and frees the mouse pointer." — [src/boogler-dialogue.js:1-3](src/boogler-dialogue.js)
- On open: `input.keys.clear(); setPadModal(padPress); if (document.pointerLockElement) document.exitPointerLock();` and the close/pet buttons get `glyph('close') || CROSS`, `glyph('pet') || HAND` — [src/boogler-dialogue.js:142-153](src/boogler-dialogue.js)
- Keyboard: capture-phase `keydown` on window that `stopPropagation()`s while open; Escape closes, Space/Enter/E skip typing or press focused button, digits pick answers, arrows/W/S move focus; keyup also stopped — [src/boogler-dialogue.js:266-297](src/boogler-dialogue.js)
- Pad: `padPress(slot)` maps b=close, y=pet, up/down=focus, a/x=confirm — [src/boogler-dialogue.js:128-138](src/boogler-dialogue.js); the modal hook lives in the registry: `setPadModal`, `padModal` — [src/controls.js:71-75](src/controls.js); gamepad.js releases held actions on entry and routes new presses to the modal instead of actions — [src/features/gamepad.js:98-109](src/features/gamepad.js)
- Even here the world is not paused (same unconditional frame loop) — [src/main.js:90-113](src/main.js)

**Pointer lock / "soft pause" on desktop.**
- Lock is requested on lobby submit and on canvas mousedown when unlocked — [src/hud.js:135-140](src/hud.js), [src/input.js:70-76](src/input.js); state is tracked in `inputState.locked` / `lockFailed` — [src/input.js:14-36](src/input.js)
- No game code handles Esc outside the dialogue (grep for `Escape` hits only boogler-dialogue.js) — [src/boogler-dialogue.js:272](src/boogler-dialogue.js). Esc therefore just triggers the browser's pointer-lock exit, after which `updateHud` shows a centered hint: mouse glyph + "Look around" — [src/hud.js:37-42](src/hud.js); styled as a glass pill at 64% height — [src/style.css:153-161](src/style.css)
- While unlocked, mouse-drag still looks around (`drag` path) and all keys still work — [src/input.js:81-96](src/input.js)

### Inferences
- A pause view in this game can only be an input-capturing overlay over a live world (DESIGN.md "Designed for drop-in, drop-out", Owner/Host/Lockstep sync all keep ticking). The dialogue's pattern — `setPadModal`, capture-phase keydown with `stopPropagation`, `input.keys.clear()`, `exitPointerLock()` — is the existing template a pause/guide overlay would reuse; today it lives in `boogler-dialogue.js` rather than a shared helper.
- The natural "open the menu" trigger on desktop (Esc) is currently consumed by the browser for pointer-lock release and is not observed by game code; a pause view would hook `pointerlockchange` (lock lost while playing and no dialogue open) rather than Esc keydown, since browsers do not deliver that Esc to the page while locked (browser behavior from general knowledge, not verified here).
- On pad, Menu already means "show controls"; that is the obvious pause-menu button.

### Gaps
- No runtime check was done of what the player actually sees after Esc (whether any overlay appears besides the hint).
- No ESC/pause behavior is specified anywhere in DESIGN.md or PLAN.md (grep), so intended behavior is unknown.

## 2. Where the guide's list of controls comes from, how features add controls, and duplication

### Takeaway
The keyboard guide is hand-written HTML plus ad-hoc `append(row)` calls from five features; the pad guide is derived from `registerAction`. `registerAction` carries only a pad slot, a label and handlers — no keyboard key, no touch button, no glyph — so keyboard bindings, touch buttons, help rows, pad labels and glyph prompts are five independent lists that already drift (stale rows, duplicate rows, missing controls, one control with no pad slot).

### Cited Findings
**The registry.**
- `registerAction(id, { pad, label = id, down, up, held })`; one action per pad slot; clashes warn and stay unbound; `listActions()` returns actions in PAD order; `freeSlots()` — [src/controls.js:52-77](src/controls.js)
- PAD is the 16 W3C standard-mapping buttons; `PAD_LABEL` is a text label table ('A', 'LB', 'View', 'D-pad ←', ...) — [src/controls.js:12-47](src/controls.js)
- Header comment says gamepad.js "lists the layout on its help card", and "New features that add a key or touch button register an action too." — [src/controls.js:1-9](src/controls.js); AGENTS.md: "a new key or touch button also calls `registerAction` (`src/controls.js`) with a free pad slot" — [AGENTS.md](AGENTS.md)
- Unit test covers slot clashes/listing only — [test/controls.test.mjs:5-26](test/controls.test.mjs)

**Current registrations (16 slots, 15 used + 1 conditional).**
- input.js: jump a, use x, interact b, respawn view, slot-prev lb, slot-next rb, dig rt, pile lt, flatten r3, sprint l3, zoom-in up, zoom-out down — [src/input.js:214-240](src/input.js)
- honk y — [src/features/honk.js:293](src/features/honk.js); ping left — [src/features/ping.js:244](src/features/ping.js); pad-help menu — [src/features/gamepad.js:136](src/features/gamepad.js)
- update-reload takes `freeSlots()[0]` (today: `right`) only when the update toast shows — [src/features/updates.js:61-65](src/features/updates.js). Commit b22fa8b says "C, the touch Talk button and the pad D-pad right slot are gone", which is why `right` is free — [git show b22fa8b]
- So the pad has effectively one free slot left (`right`), and it is borrowed by the update toast.
- feel.js monkey-patches the registered `dig` action object to dive while swimming: `const dig = listActions().find((a) => a.id === 'dig'); ... dig.down = () => (swimDive() ? dive() : down?.())` — its label stays "Dig (hold)" — [src/features/feel.js:113-124](src/features/feel.js)

**Keyboard bindings are not in the registry.**
- Built-ins are hard-coded in one keydown/keyup handler: Space, Shift (sprint and `setFlatten`), E, R, F, Q, Z, H — [src/input.js:39-67](src/input.js); mouse buttons/wheel in [src/input.js:69-118](src/input.js)
- Features add their own window `keydown` listeners, each re-implementing the typing/modifier guard: T honk — [src/features/honk.js:289-291](src/features/honk.js); G ping (+ middle click) — [src/features/ping.js:234-241](src/features/ping.js); V bump — [src/features/bump.js:53-57](src/features/bump.js); Q dive — [src/features/feel.js:114-117](src/features/feel.js); 1-8 hotbar — [src/features/hotbar.js:196-199](src/features/hotbar.js)
- The guards differ: honk/ping use `typing()` against `dom.nameInput`; hotbar checks `e.target?.tagName === 'INPUT'` and `me.entered`; bump checks `document.activeElement === dom.nameInput` but not `me.entered`; feel.js checks neither — [same refs as above]

**Help rows are appended by hand.** (all use `document.getElementById('help')?.append(row)`)
| Source | Rows added | Ref |
|---|---|---|
| index.html | 10 static rows | [index.html:36-45](index.html) |
| bump | V "Bump the ball up (volleyball dig)" (innerHTML) | [src/features/bump.js:60-62](src/features/bump.js) |
| honk | T "Honk (three friends at once make a chord)" (innerHTML) | [src/features/honk.js:294-296](src/features/honk.js) |
| hotbar | 1-8 "Hold something from your hotbar…", E "Talk, pick up, take, shake a palm" | [src/features/hotbar.js:201-212](src/features/hotbar.js) |
| ping | G "Ping where you look (or middle click)" (innerHTML) | [src/features/ping.js:245-247](src/features/ping.js) |
| shovel | Q "Dig (hold to repeat, no shovel mode needed)", Z "Pile up sand", Shift+click "Flatten toward your feet" | [src/features/shovel.js:10-23](src/features/shovel.js) |
- Total 18 rows. Two different DOM-building styles: `innerHTML` strings (bump, honk, ping) vs `createElement` loops (hotbar, shovel).
- Row order follows feature load order from `import.meta.glob('./features/*.js', { eager: true })` — [src/main.js:22](src/main.js) — and `onStart` registration order — [src/loop.js:21-29](src/loop.js), so "H Hide these controls" sits mid-list and E (the main interact key) comes after V and T.

**A fourth list: README.**
- "WASD move · Space jump/swim · Shift sprint · Click grab, hold to charge, release to throw · R … · F shovel on/off · Q dig · Z pile · Shift+click flatten · Click the seed stall for seeds and the watering can · H hide help. The in-game help panel is the full list." — [README.md:48-50](README.md)

**Concrete drift / staleness.**
- index.html still says Click = "Use what you hold (empty hands: same as E)" and Hold = "Charge, release to throw" — [index.html:39-40](index.html); commit b22fa8b changed semantics: "Tools can no longer be thrown with keyboard or gamepad; touch keeps its Toss button" and "E no longer throws what you hold" — [git show b22fa8b]. The rows are at best partly stale (ball charge/throw may still apply; not verified).
- index.html's "Click — Shovel: dig" / "Right click — Shovel: pile" — [index.html:43-44](index.html) — and shovel.js's Q/Z rows — [src/features/shovel.js:12-13](src/features/shovel.js) — describe the same two operations in two places.
- The E row is added by hotbar.js — [src/features/hotbar.js:203](src/features/hotbar.js) — while index.html's Click row already references E — [index.html:39](index.html); the interact key is owned by input.js — [src/input.js:50](src/input.js), not hotbar.
- README says "Click grab" and "Click the seed stall" — [README.md:50](README.md); b22fa8b moved grab/take to E ("E … acts on the one thing in front of you: … take from the stall … grab the ball") — [git show b22fa8b]. README omits E, T, G, V, 1-8.
- Missing from the keyboard guide entirely: Q dives while swimming — [src/features/feel.js:115](src/features/feel.js); mouse wheel zoom — [src/input.js:111-118](src/input.js); Esc (frees the mouse; closes talk) — [src/boogler-dialogue.js:272](src/boogler-dialogue.js); mouse-drag look when unlocked — [src/input.js:86-95](src/input.js); dialogue keys (1-9, arrows).
- Shift does two things: sprint (keys set) and `setFlatten(true)` (preview shows flatten brush, Shift+click flattens) — [src/input.js:42](src/input.js), [src/world/terrain-edits.js:146-147](src/world/terrain-edits.js); the guide lists them as separate rows without noting the overlap.
- Bump (V, touch "Bump" button) never calls `registerAction`, so it has no pad slot and is absent from the pad card — [src/features/bump.js:53-73](src/features/bump.js); this violates AGENTS.md's "Every control is playable on a Backbone-style gamepad" rule — [AGENTS.md](AGENTS.md).
- Touch "Toss" exists only on touch — [src/features/hotbar.js:133-148](src/features/hotbar.js); hotbar 1-8 direct select exists only on keyboard (pad cycles with LB/RB) — [src/input.js:228-229](src/input.js).
- Pad labels describe the pad, keyboard rows describe keys, and the wording differs per surface: pad "Use what you hold (hold to throw a thing)" — [src/input.js:220](src/input.js) — vs keyboard "Use what you hold (empty hands: same as E)" — [index.html:39](index.html).

**What a new feature author edits today to get one control into all surfaces**
- (1) a `keydown` listener with its own guard, (2) a hand-built help row appended to `#help`, (3) `registerAction` with a free pad slot and a label (pad card), (4) a `.tbtn` button appended to `#touch` with handlers, (5) CSS absolute position for that button in the feature CSS, (6) optionally a `GLYPHS` entry in `src/glyphs.js` for prompts, (7) README if they remember. Example: honk does (1)-(5) across [src/features/honk.js:287-305](src/features/honk.js) and [src/features/honk.css:2-8](src/features/honk.css).

### Inferences
- The registry is the obvious seed for a single source of truth: extending the `registerAction` record with `keys` (codes + display label), `touch` (button spec), `group`/`order`, and `when` (context such as shovel/swimming/holding) would let the keyboard panel, pad card, README table and glyph lookups all derive from it. The current schema simply lacks those fields.
- Because the pad has one free slot, adding any new control will soon force the "rethink the layout" path AGENTS.md describes; context-sensitive slots (dig→dive already does this by monkey-patching) suggest the registry needs first-class contextual actions.
- The hard-coded rows mean scenario/unit tests cannot detect a missing guide entry; a derived guide would make "every registered action appears in the guide" testable.

### Gaps
- Whether ball charge-and-throw by holding click still works on keyboard after b22fa8b was not run-time verified, so "partly stale" for index.html:39-40 is a judgment from the commit message.
- No documentation states who owns `#help` row order or wording.

## 3. How glyph prompts work: input-device detection, rendering, pad slots

### Takeaway
Glyphs are HTML strings from a tiny 5-entry table in `src/glyphs.js` (keycap `<kbd>`, inline SVG mouse, coloured CSS circles for pad buttons), chosen by `inputKind()`, which reads body classes. The table duplicates pad-slot knowledge from the registry by hand and covers only interact/use/alt/close/pet; device switching is one-way in places.

### Cited Findings
- API: `glyph(action)` for 'interact' (E / B), 'use' (click / X), 'alt' (right click / LT), 'close' (Esc / B), 'pet' (Y on pad only); `inputKind()` → 'pad' | 'touch' | 'kbm' — [src/glyphs.js:1-6](src/glyphs.js)
- Detection: `document.body.classList.contains('gamepad') ? 'pad' : …contains('touch') ? 'touch' : 'kbm'` — [src/glyphs.js:9-10](src/glyphs.js)
- Table: `kbm: { interact: key('E'), use: MOUSE('l'), alt: MOUSE('r'), close: key('Esc'), pet: '' }`, `pad: { interact: pad('b'), use: pad('x'), alt: pad('lt','LT'), close: pad('b'), pet: pad('y') }`, `touch: {}` — [src/glyphs.js:22-26](src/glyphs.js)
- Rendering: keys are `<kbd class="g g-key">`, mouse is an inline SVG with the pressed half filled `var(--sun)` and an aria-label, pad buttons are `<span class="g g-pad" data-b=… role="img">` — [src/glyphs.js:12-20](src/glyphs.js); styles: paper keycap 24px with 4px bottom border, mouse 17×24, pad 25px circle in Lilita One, colours per button (A green #3fae4a, B red #e2453c, Y yellow #f2b81a, default blue #3a7be0, LT a rounded slate tab) — [src/glyphs.css:1-49](src/glyphs.css). No image assets.
- Body classes: `touch` set once at init from `matchMedia('(pointer: coarse)')` — [src/constants.js:33](src/constants.js), [src/input.js:30](src/input.js); `gamepad` toggled on any stick/button activity — [src/features/gamepad.js:36-50](src/features/gamepad.js), [src/features/gamepad.js:95](src/features/gamepad.js); turned off only by disconnect or a `touchstart` — [src/features/gamepad.js:143-146](src/features/gamepad.js). A keyboard or mouse event does not clear `gamepad`.
- Consumers: interact prompt projected over the target (`chip(t)` = glyph('interact') + verb; blocked state with reason) — [src/features/prompt.js:18-20](src/features/prompt.js), positioned each `late` frame by projecting `t.at` — [src/features/prompt.js:30-63](src/features/prompt.js); routed into The Boogler's name tag instead when the target is him — [src/features/prompt.js:36](src/features/prompt.js), [src/boogler-hud.js:71-73](src/boogler-hud.js); hotbar name tag shows `glyph('use')` + verb and `glyph('alt')` + `ALT_VERB` (only `{ shovel: 'Pile' }`) — [src/features/hotbar.js:76](src/features/hotbar.js), [src/features/hotbar.js:151-160](src/features/hotbar.js); "Look around" hint — [src/hud.js:37-42](src/hud.js); dialogue close/pet buttons — [src/boogler-dialogue.js:151-152](src/boogler-dialogue.js)
- The prompt re-renders when `inputKind()` changes (`kind !== ui.kind`) — [src/features/prompt.js:44-48](src/features/prompt.js); the hint caches on `lastHint` and only shows for kbm — [src/hud.js:37-42](src/hud.js)
- Touch: no glyph; the action button's text becomes the verb (`dom.grabBtn.textContent = label`) — [src/hud.js:43-46](src/hud.js); `body.touch .prompt-chip { padding-left: 14px }` — [src/features/prompt.css:47-49](src/features/prompt.css)
- Pad-slot duplication: glyph 'interact' → `pad('b')` mirrors `registerAction('interact', { pad: 'b' })` — [src/input.js:221-226](src/input.js); 'use' → x mirrors [src/input.js:220](src/input.js); 'alt' → LT matches the `pile` action on lt — [src/input.js:231](src/input.js); 'pet' → y is the dialogue modal's mapping — [src/boogler-dialogue.js:131](src/boogler-dialogue.js) — while y is otherwise honk — [src/features/honk.js:293](src/features/honk.js). Keyboard 'E' duplicates [src/input.js:50](src/input.js).
- Commit b22fa8b introduced glyphs.js/glyphs.css, prompt.js/css and item-icons, touching 22 files; it is covered by `dev/scenarios/interact.mjs` which checks the mouse-glyph hint, B glyph in The Boogler's tag on gamepad, and the touch action button label — [git show --stat b22fa8b], [dev/scenarios/interact.mjs:127-183](dev/scenarios/interact.mjs)

### Inferences
- If the registry knew each action's key and pad slot, `glyph()` could be `glyph(actionId)` resolved from the registry, removing the hand-kept GLYPHS table and preventing a remap from silently mislabelling prompts.
- The help panel and pad card do not use these glyphs at all (see section 4), so the "glyph language" introduced in b22fa8b stops at prompts.
- Platform face-button art is Xbox-coloured (A green, B red, X blue, Y yellow); Backbone/PlayStation/Switch layouts are not distinguished (no `gamepad.id` inspection in gamepad.js).

### Gaps
- Whether a keyboard user with a pad plugged in sees pad glyphs indefinitely was inferred from code, not observed.

## 4. Other HUD/menu UI and shared style conventions

### Takeaway
The HUD is a set of independently positioned overlays inside `.hud` (or `body`), sharing a small token set in `:root` and two visual dialects ("glass" pills for status, "paper sticker" cards for prompts/lobby). There is no settings screen, no chat, and only one toast; keycaps are styled two different ways.

### Cited Findings
- Static HUD skeleton in index.html: `.hud` with `.hud-tl` (brand + roster), `.hud-tr` (net status), reticle, charge bar, `#hint`, `#shovel-chip`, `#help`; `#touch` overlay with stick and 5 buttons; `#lobby` join card (name, colour swatches, Jump in) — [index.html:21-75](index.html)
- Element registry: `dom` object of getElementById lookups — [src/hud.js:9-31](src/hud.js); lobby logic, localStorage for name/colour — [src/hud.js:118-141](src/hud.js); roster/net label — [src/hud.js:49-96](src/hud.js)
- Feature-created HUD: hotbar (bottom centre, moves to top on touch) — [src/features/hotbar.css:1-11](src/features/hotbar.css), [src/features/hotbar.css:140-156](src/features/hotbar.css); interact prompt — [src/features/prompt.js:22-28](src/features/prompt.js); ping layer — [src/features/ping.js:227](src/features/ping.js); pad card — [src/features/gamepad.js:138-142](src/features/gamepad.js); update toast, top centre, z-index 30, appended to body — [src/features/updates.js:50-68](src/features/updates.js), [src/features/updates.css:1-15](src/features/updates.css); Boogler HUD/tag/dialogue (z-index 20) — [src/features/boogler.css:179](src/features/boogler.css); dev-only netdebug overlay `?netdebug=1` — [src/features/syncsafety.js:1-12](src/features/syncsafety.js)
- No settings (sensitivity, volume, invert, key rebinding), no chat (grep found none; DESIGN.md says "Nobody should need to coordinate in chat") — [DESIGN.md:27](DESIGN.md)
- Tokens: `--ink, --ink-soft, --paper, --sun, --sea, --sky, --glass, --glass-line, --on-glass, --font-display ('Lilita One'), --font-body ('Figtree')` — [src/style.css:2-15](src/style.css); fonts loaded from Google Fonts in index.html — [index.html:11-16](index.html)
- "Glass" dialect: `.roster li, .net, .hint` pill with `var(--glass)`, blur(8px), 13px/700 — [src/style.css:70-84](src/style.css); `.help` uses the same glass — [src/style.css:162-177](src/style.css)
- "Paper sticker" dialect: lobby `.card` (paper, 3px ink border, 0 8px 0 ink shadow) — [src/style.css:271-283](src/style.css); prompt chip (paper, 3px ink border, 0 3px 0 ink shadow, Lilita 18px) — [src/features/prompt.css:20-36](src/features/prompt.css)
- Two keycap styles: global `kbd` = translucent white on glass, 11px — [src/style.css:187-197](src/style.css) (used by help panel, pad card, dialogue answer numbers); `.g-key` = paper keycap, ink border, 13px — [src/glyphs.css:7-18](src/glyphs.css) (used by prompts). The pad card shows pad buttons as text in plain `kbd` ("D-pad ←", "LB") rather than `.g-pad` circles — [src/features/gamepad.js:66-72](src/features/gamepad.js)
- Visibility is driven by body classes: `playing`, `touch`, `gamepad`, `help-hidden`, `shovel`, `holding-thing` — [src/style.css:198-216](src/style.css), [src/features/shovel.css:28-46](src/features/shovel.css), [src/features/hotbar.css:165-167](src/features/hotbar.css)
- `prefers-reduced-motion` is respected for the lobby button and prompt pop — [src/style.css:381-385](src/style.css), [src/features/prompt.css:83-88](src/features/prompt.css)
- Touch buttons: base `.tbtn` 76px circles — [src/style.css:237-258](src/style.css); each feature hard-codes absolute `right`/`bottom` px: grab 22/110, jump 108/34 — [src/style.css:250-258](src/style.css); shovel 22/198, dig 108/120, pile 194/120, flat 280/120 — [src/features/shovel.css:21-51](src/features/shovel.css); bump 22/274 — [src/features/bump.css:2-8](src/features/bump.css); toss 108/274 — [src/features/hotbar.css:157-164](src/features/hotbar.css); ping 194/34 — [src/features/ping.css:109-115](src/features/ping.css); honk 268/34 — [src/features/honk.css:2-8](src/features/honk.css)

### Inferences
- The touch layout is a hand-packed grid spread over five CSS files with no shared layout source; adding a button means picking free coordinates by reading all of them. At 280px from the right (flatten) plus the stick zone on the left 45% of the screen (`e.clientX < innerWidth * 0.45`, [src/input.js:125](src/input.js)), a narrow phone in portrait (~375px) likely has buttons overlapping the stick zone; not verified.
- A cleaner guide would reuse the paper-sticker dialect and `.g-*` glyphs so the guide, prompts and pad card look like one system.

### Gaps
- No screenshots were taken; actual overlap of the 18-row help panel (bottom-left) with the hotbar (bottom centre) on short desktop windows, and of touch buttons on small phones, is unverified (use `npm run look` / a scenario).

## 5. Pain points, hotspot edits, docs and history

### Takeaway
The main maintainability problem is that a control's identity is spread across up to seven places with no derivation, so the guide is already stale and incomplete one day after the glyph commit; docs set "telegraph everything" and "drop-in" as the relevant principles but say nothing about a pause or guide design.

### Cited Findings
- Hotspot files involved: `index.html` holds the help rows and touch buttons — [index.html:35-56](index.html); `src/style.css` holds `.help`, `kbd`, `.tbtn` base — [src/style.css:162-258](src/style.css); AGENTS.md lists `src/main.js`, `src/style.css`, `index.html`, `PLAN.md` as hotspots to keep to "a line or two" — [AGENTS.md](AGENTS.md). Features avoid editing them by appending to `#help`/`#touch` at runtime — e.g. shovel's comment "created here so index.html stays untouched" — [src/features/shovel.js:8](src/features/shovel.js)
- DESIGN.md principle 7 "Telegraph everything" ("A player who just dropped in should immediately understand the shared goal") — [DESIGN.md:37-38](DESIGN.md); principle 8 "Designed for drop-in, drop-out" ("Nothing should need a full lobby, a start button…") — [DESIGN.md:40-41](DESIGN.md). prompt.js cites principle 7 — [src/features/prompt.js:1-4](src/features/prompt.js); gamepad.js cites drop-in — [src/features/gamepad.js:1-4](src/features/gamepad.js)
- PLAN.md has only the ticked gamepad item ("every control registers a pad slot in `src/controls.js`") and the flatten item mentioning Shift+click/touch/Q/Z; no item for a guide, pause, settings or onboarding — [PLAN.md:88](PLAN.md), [PLAN.md:139](PLAN.md)
- docs/playtests.md has no entries mentioning controls, keys, buttons, help, pad, touch or menus (grep returned nothing) — [docs/playtests.md](docs/playtests.md)
- History of the relevant files: 8a5174d "Add gamepad controls via a shared action registry" (introduced controls.js, gamepad.js, the pad card and the AGENTS rule); ce119c8 "Make gamepad sprint a click toggle"; 0945104 "…keep pad focus on the game"; 767d6ca "Release held input when its release event never arrives"; 4228bc8 "Stop hiding the page on touch devices"; ea2c2bb added Q/Z/flatten; 89ce0dd hotbar; b22fa8b glyph prompts (by a different author, Grant) — [git log -- src/controls.js src/glyphs.js src/features/gamepad.js src/features/prompt.js index.html src/style.css src/input.js src/hud.js]
- 8a5174d's message: "Built-in controls, honk and ping register their slots there … Menu shows the layout. AGENTS.md now asks new controls to claim a pad slot." Bump predates/was missed by that sweep — [git show 8a5174d], [src/features/bump.js:53-73](src/features/bump.js)
- iPadOS focus quirk: a focused button gets "pressed" by pad A, so gamepad.js steals focus back to the canvas except for inputs and while a modal runs — [src/features/gamepad.js:25-32](src/features/gamepad.js), [src/features/gamepad.js:98-111](src/features/gamepad.js). Any menu with focusable buttons must cooperate with this (the dialogue does via the pad modal).
- Before entering, pad A clicks "Jump in" — [src/features/gamepad.js:113-119](src/features/gamepad.js); the lobby is the only pre-game "menu".

### Inferences
Pain-point summary for the report writer (each traceable to the findings above):
1. Five-plus parallel control lists (index.html rows, feature-appended rows, registerAction labels, GLYPHS table, README, touch buttons) with no single source; already drifted (stale throw/E text, duplicate dig/pile rows, missing dive/zoom/Esc, bump without pad slot).
2. Guide order is accidental (feature filename order).
3. Guide is surface-specific and inconsistent: keyboard panel always-on bottom-left, pad card centred and transient, touch nothing; none shows context (shovel/swimming/holding) even though the HUD already knows it (`body.shovel`, `holding-thing`, `useVerb()`).
4. No pause/menu: no place for settings, a full guide, room info or "leave"; Esc behavior is left to the browser.
5. Visual inconsistency: two kbd styles; pad card uses text instead of the coloured `.g-pad` glyphs.
6. Device detection: `touch` fixed at load; `gamepad` sticky until touch/disconnect.
7. Keyboard handlers duplicated per feature with divergent guards (a pause overlay would need every one of them to respect it, as the dialogue achieves only by capture-phase `stopPropagation`).
8. Pad slots nearly exhausted (only `right` free and borrowed by the update toast).
9. Touch button positions hard-coded per feature CSS; collision-prone on small phones.

### Gaps
- No playtest evidence about controls confusion exists in docs/playtests.md.
- docs/research/ and reports/ were not read for UI recommendations (out of scope: codebase state only).
- Mobile/touch layout and help-panel overlap not visually verified.
