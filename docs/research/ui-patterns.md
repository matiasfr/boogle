# UI that is pleasant, satisfying and fun

*Research report, 1 November 2026. How shipped games make their interface quiet, playful and juicy: minimal HUDs and diegetic UI (Breath of the Wild and Tears of the Kingdom, Dead Space, Firewatch, Sea of Thieves, Death Stranding), playful UI (Persona 5, Hi-Fi Rush, Splatoon, Animal Crossing, Mario Wonder, Super Mario Maker, Pikmin 4, Fortnite, Fall Guys, Tunic, Untitled Goose Game, Astro Bot, Nintendo system sounds), juice and motion, accessibility, and what a web page on an iPad Pro can afford. Builds on [controls-guide-and-pause-menu.md](controls-guide-and-pause-menu.md) (the control registry, pause view and paper-card look) without repeating it. Boogle's side was read from `main` at c8ad8ed: [src/style.css](../../src/style.css), the CSS of the hotbar, prompt, haul chip, pause, first-run and ping features, and [src/render/audio.ts](../../src/render/audio.ts). Nothing was run on an iPad. Recommendations only; no design decisions.*

**Markers.** **[V]**: the page was fetched and the point matches it. **[S]**: seen only in a search summary, a review or a fan wiki; check before quoting. **[C]**: computed here from the code and a cited rule. Findings are paraphrased, not quoted.

## Summary

1. The best-loved game UIs pick a side per piece of information: either it lives in the world (a map in your hands, a health spine, a plaque) or it is a bold, fast, branded overlay. Mushy in-between HUD is what players call clutter.
2. Nintendo's Zelda team aimed for UI that is better when absent [V], yet in Tears of the Kingdom chose to answer feelings rather than vanish; the loading screen became trip planning. Minimal is a starting point, not a goal.
3. Playful UI comes from one strong identity (Persona 5: one colour, one line that leads the eye [V]) and from things reacting to you (Hi-Fi Rush pulses UI on the beat [V]; Mario Maker sings the name of what you place [S]).
4. Juice is tweening, overshoot, squash and sound on every touch, but it amplifies a good loop and cannot rescue a dull one (Jonasson and Purho, 2012 [S]).
5. Sound is the cheapest juice and Boogle's HUD has none: the hotbar, prompt, haul chip and pause view are silent today, while honk, ping and impact already share a WebAudio context.
6. Motion that feels good on screens is short: 100–300 ms, ease-out to enter, shorter to leave, overshoot kept for a few "landings" [S]. CSS `linear()` makes real spring curves without JavaScript [V].
7. Hodent's Fortnite tests [V]: at most three new things at once while learning; small signifiers get missed; a pop-up read once is forgotten; pin the one number players keep checking.
8. Accessibility rules that bite Boogle: 4.5:1 text contrast [V]; never colour alone [V]; XAG's tablet text minimum works out to about 24 CSS px of glyph height on an M4 iPad Pro [C], against 13 px chips today.
9. On iPad Safari, keep HUD in the DOM but animate only `transform` and `opacity` [V]; `backdrop-filter` costs extra passes [V], and over a canvas that changes every frame it can never be cached. Haptics are not available to web pages on iOS [S].
10. Top five, ranked: a UI sound kit; one motion vocabulary with press feedback; a haul count that ticks and pops; a legibility pass sized for the iPad; one quiet notification lane, with world-space boards first.

## Findings per source

### Minimal HUDs and diegetic UI

**Breath of the Wild and Tears of the Kingdom (Nintendo, Daigo Shimizu).** In a Nintendo recruiting post, the UI designer on BotW and senior lead UI artist on TotK describes the BotW goal as a UI better off absent, replacing the ornate HUDs of older Zelda games [V] ([nintendo.co.jp](https://www.nintendo.co.jp/jobs/keyword/150.html); English summary at [Zelda Dungeon](https://www.zeldadungeon.net/breath-of-the-wild-tears-of-the-kingdom-developer-shares-design-philosophy-behind-games-ui/)). For TotK the team considered going nearly invisible but chose instead to answer the player's emotions. Two examples: the warp loading screen shows the destination map so waiting becomes preparation for the next trip, and a recipe memo exists because looking at food photos is a pleasure in itself [V]. The method is to start from an everyday feeling (planning a trip on a map) and ask whether the UI can carry it. BotW also shipped a "Pro" HUD option that keeps only hearts [S] ([Shacknews](https://www.shacknews.com/article/98914/zelda-breath-of-the-wild-hud-pro-mode-gives-you-a-sparse-ui)).

**Dead Space (Visceral, Dino Ignacio, GDC 2013).** The talk walks through the front end, the bench and the RIG, the suit whose spine shows health and whose projections show inventory and map ([GDC Vault](https://gdcvault.com/play/1017723/Crafting-Destruction-The-Evolution-of), [recording](https://archive.org/details/GDC2013Ignacio)). The aim was to take away the safety barrier between player and game [V] ([Game Developer](https://www.gamedeveloper.com/design/video-designing-i-dead-space-i-s-immersive-user-interface)). A later critique notes the holographic map mostly failed at navigation and a floor locator line was added [S] ([Medium](https://medium.com/@jaiwanthshan/designing-effective-diegetic-ui-lessons-learned-from-dead-spaces-success-and-the-callisto-dbf803639dd6)). Lesson: diegetic is great for status (health on the back), weak for wayfinding, which needs something drawn in the world, like Boogle's ping.

**Diegesis as a lens (Game Developer).** A survey of diegetic UI (GoldenEye's watch, Half-Life's suit, Overwatch's weapon readouts, Resident Evil's typewriters, Firewatch's map) ends on the right caution: being diegetic is no measure of quality, and FTL or Europa Universalis work fine as pure overlays; readability decides [V] ([Game Developer](https://www.gamedeveloper.com/design/diegesis-and-designing-for-immersion)).

**Firewatch (Campo Santo).** The map and compass are objects Henry holds up, filling the view; notes scrawled on the map change with your choices; the HUD is a dot that can be switched off [S] ([Game Developer](https://www.gamedeveloper.com/design/how-firewatch-s-ui-enhances-player-immersion)). The cost is that some players get lost. The pay-off is that the map itself carries story.

**Sea of Thieves (Rare).** Navigation is a map table below deck that one player drives while crewmates look on, and the HUD is a health bar that hides at full health [S] ([fan wiki](https://seaofthieves.fandom.com/wiki/Map_Table), [UX essay](https://medium.com/design-bootcamp/sea-of-thieves-lessons-in-ux-from-a-pirates-perspective-63d6381c7c38)). For a co-op game the point is social: a map in the world is something friends gather around and argue over, which a private overlay never is.

**Death Stranding (Kojima Productions).** Likes are the progression currency, popping up from structures other players built, and the Cuff-link shows status as holograms [S] ([Game Developer](https://www.gamedeveloper.com/design/a-design-discussion-on-death-stranding)). The same analysis calls its menus a major problem [S]. Two lessons: a warm, frequent, low-stakes "someone appreciated this" is a lovely notification, and dense menus undo it.

### Playful UI

**Persona 5 (Atlus, Masayoshi Sutoh).** At CEDEC + KYUSHU 2017 the art director explained that the UI became a selling point after a lean period: red as the one main colour, no sub-colours except HP and SP, a white line through the menu because eyes follow lines, brighter areas for what matters, and a posed 3D hero that moves as you navigate [V] ([Persona Central](https://personacentral.com/persona-5-panel-concept-development-ui/)). He picks the main colour first, then the logo and key font, and wants UI that guides intuitively and lightly, where light means playful or surprising [V]. In Famitsu he described testing black and white text against the crimson until it read [S] ([Persona Central](https://personacentral.com/persona-5-interview-ui-design-sound-music/)). Masahiro Sakurai called the GUI the game's standout feature [S] ([Persona Central](https://personacentral.com/super-smash-bros-series-creator-discusses-persona-5s-ui/)).

**Hi-Fi Rush (Tango Gameworks, John Johanas).** The first UI showed the beat and reacted to a correct press; playtests showed players perceive rhythm so differently that the team piled on cues: a cat on Chai's shoulder, swaying props, an optional beat bar [V] ([Digital Trends](https://www.digitaltrends.com/gaming/hi-fi-rush-john-johanas-interview/)). His conclusion: accessibility here meant many cues, not one [V]. A debug view drawn like sheet music became the design aid [S] ([Unreal Engine](https://www.unrealengine.com/developer-interviews/hi-fi-rush-was-inspired-by-shaun-of-the-dead-and-futurama)). Lesson: one shared clock (in Boogle, the world tick or music) can drive UI pulses that make the whole screen feel alive, and redundancy across sound, world and HUD is what makes a cue reach everyone.

**Splatoon (Nintendo).** In Iwata Asks, the team made the map cursor a squid partly because a squid reads as an arrow from above, and removed ink on walls for a while because it did not show on the map [S] ([Iwata Asks](https://iwataasks.nintendo.com/interviews/wiiu/splatoon/0/3/)). Its colour-lock option is a cited accessibility example [V] ([Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-colour-alone/)). Lesson: the UI shapes the mechanic when readability is a rule, and the playful shape (a squid) can also be the functional one (an arrow).

**Animal Crossing: New Horizons.** The NookPhone borrows a phone everyone already knows, so a sprawling set of systems sits behind familiar app icons; pastel colours and pops, clicks and chimes match the cute interface [S] ([PatternFly case study](https://medium.com/patternfly/crossing-a-line-a-case-study-of-animal-crossing-new-horizon-s-ux-3a670676fd05), [Design At The End Of The World](https://itsratpizza.com/posts/2025-03-15-animal-crossing-delightfully-cosy-gaming/)). Players praise its clean look and grumble at click depth [S] ([Engadget](https://www.engadget.com/animal-crossing-nookphone-user-review-roundup-130033026.html)). Lesson: a diegetic device can hold the menus (the island has phones, Boogle could have a pocket notebook), and familiar structure frees the art to be silly.

**Super Mario Bros. Wonder (Nintendo).** The Talking Flowers began as Tezuka's wish for live commentary on the player's play; six months of announcer prototypes became flowers that praise or commiserate to keep players motivated, more often and for smaller feats [V] ([Game Developer](https://www.gamedeveloper.com/design/the-talking-flowers-in-super-mario-bros-wonder-became-nintendo-s-very-own-mr-motivator); [Ask the Developer](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-11-super-mario-bros-wonder-part-3/)). Lesson: encouragement belongs to characters in the world, not to a toast. Boogle has The Boogler.

**Super Mario Maker (Nintendo).** Tezuka wanted to bring Mario Paint's fun to a course editor; the editor sings the names of the parts you place in time with the music, and the title screen is itself a toy [S] ([Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_Maker), [Time](https://time.com/4030885/super-mario-maker-nintendo-wii-u/)). This is the clearest case of "menus as toys": every touch makes a sound that fits the music, and there is something to poke on the first screen.

**Pikmin 4 (Nintendo).** The directors set out to lower the barrier for newcomers with features that make it easier to play, from camera and AI fixes to "Rewind Time", which takes you back a few minutes after a mistake [V] ([Ask the Developer](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-10-pikmin-4-part-2/)). Miyamoto names controls and depth as the two things that make Pikmin hard [V]. Lesson for Boogle's slapstick: make undoing cheap, and the UI can stay out of the way.

**Fortnite (Epic, Celia Hodent, GDC 2016).** Hodent's onboarding talk is a set of Fortnite playtest findings [V] ([celiahodent.com](https://celiahodent.com/gamers-brain-ux-onboarding/)): three things at once is the maximum while learning; a small red corner mark on slotted workers went unseen; a narrated repair tip was forgotten; 20 minutes after a crafting tutorial a player could not reopen the craft screen; a player kept opening a panel to check one number until it was pinned to the HUD; separating the HUD into tools, weapons and abilities made new unlocks get used, and empty slots teased what was coming; the first loading screen had too much text and players looked at the art. Her framing: signs and feedback must be noticeable, legible and audible, and form should say what a thing does.

**Fall Guys (Mediatonic).** No designer talk turned up. Critiques praise menus polished enough to rival mobile apps, note that drop shadows make static things look tappable, and point at the store and wardrobe as friction [S] ([Medium](https://medium.com/game-science/deconstructing-fall-guys-how-to-supercharge-organic-installs-19a9e3c9ef6)); one concept redesign proposes emoting in the menu and confetti on wins [S] ([Andrew Connell](https://www.andrew-connell.com/cs-fall-guys)). The useful warning for Boogle's paper style: a hard drop shadow says "press me", so reserve it for things you can press.

**Tunic (Andrew Shouldice).** The in-game manual is collected page by page, mixes polished illustrations with doodles, and was printed, folded, stained and scanned to feel like an old NES booklet [S] ([PlayStation Blog](https://blog.playstation.com/2022/09/21/the-creation-of-tunics-invaluable-in-game-manual/), [80.lv](https://80.lv/articles/tunic-s-developer-on-creating-the-in-game-manual-full-of-mysteries)). A menu can be a thing you find and treasure, and its look can carry the world's history.

**Untitled Goose Game (House House).** Each area has a hand-written to-do list of pranks that gets crossed off; Michael McMaster did art direction and UI, and the visual goal was clean, very readable and approachable [S] ([Tumblr spotlight](https://www.tumblr.com/gaming/187842058055/indie-game-spotlight-untitled-goose-game-oh)). The list is already analysed in [system-cohesion.md](system-cohesion.md); the UI point is that a paper list with a pencil strike is goal tracking that reads as a joke.

**Astro Bot (Team Asobi, Nicolas Doucet).** The haptic showpiece is physics: leaves you can feel one by one, grass against metal; the team deliberately held back from constant buzzing [S] ([TechRadar](https://www.techradar.com/gaming/astro-bot-nicolas-doucet-interview), [Notebookcheck](https://www.notebookcheck.net/Astro-Bot-director-lauds-the-PS5-It-s-brought-something-truly-special-to-gaming.1145573.0.html)). Feedback is tied to things in the world, and restraint keeps it meaningful.

**Nintendo system sounds.** No designer interview turned up. Players single out the Switch's and Wii's little menu sounds, and Switch 2 redid them while keeping the feel [S] ([Nintendo Life](https://www.nintendolife.com/news/2018/08/random_making_music_with_the_switchs_user_interface), [Glitched](https://www.glitched.online/nintendo-shares-what-the-switch-2-sounds-like/)). Generic UI sound guides agree on three things: most UI sounds sit between 80 and 300 ms, rising pitch reads as good and falling as bad, and small random pitch changes stop repeats from grating [S] ([SFX Engine](https://sfxengine.com/blog/best-practices-for-game-ui-sounds), [uisfx](https://uisfx.com/ui-sound-design)).

### Juice and motion

**"Juice it or lose it" (Martin Jonasson and Petri Purho, Nordic Game Jam 2012).** They turn a flat Breakout into a lively one live on stage: tween blocks in, squash on hits, sound, particles, shake [S] ([write-up](https://roblog.co.uk/2024/03/juicy-games/), [notes](https://maldorne.org/2022/04/08/game-design-juice-it-or-lose-it/)). Vlambeer's "The Art of Screenshake" followed. The common caution: juice makes a good loop feel better and cannot fix a bad one [S]. For UI, juice means a press always answers (squash, sound), arrivals overshoot a little, and numbers move rather than jump.

**Motion timing.** Material's speed guidance: small elements around 100 ms, larger travel takes longer, closing is faster than opening [S] ([Material](https://m2.material.io/design/motion/speed.html)). Emil Kowalski: ease-out feels faster than ease-in at the same duration [S] ([7 practical animation tips](https://emilkowal.ski/ui/7-practical-animation-tips)). Several guides: most UI motion 100–300 ms; spring easing for presses and success, plain ease-out for menus; overshoot only on a few "landings" per screen [S]. CSS `linear()` takes any number of points, including values above 1, so a sampled spring can run as a pure CSS animation; it has been Baseline since December 2023 [V] ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear), [generator](https://linear-easing-generator.netlify.app/)).

**Game UI Database (Edd Coates).** A free reference of over 55,000 screenshots and 1,700 videos from 1,341 games, filterable by screen type and HUD element [S] ([Game Developer](https://www.gamedeveloper.com/design/game-ui-database-relaunches-with-new-features-video-support-and-over-55-000-screenshots), [gameuidatabase.com](https://www.gameuidatabase.com/)). It is the place to pull side-by-side references for each prototype below (filter "HUD: interaction prompt", "notification", "pause").

### Accessibility

**Xbox Accessibility Guidelines.** XAG 101 sets minimum text body height (lowest descender to highest ascender): 26 px at 1080p on console, 18 px at 1080p on PC, and for mobile 18 px at 100 DPI scaling linearly with DPI; text should scale to 200%, offer a plain sans-serif, and a screen magnifier does not count [V] ([XAG 101](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-101-text-display)). XAG 102: 4.5:1 for text and essential visuals, 3:1 for large text, 7:1 in high-contrast mode; disabled text at least 2.5:1 [S] ([XAG 102](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/102), [history](https://learn.microsoft.com/en-us/xbox/accessibility/xag-version-history)).

**Game Accessibility Guidelines.** No essential information by colour alone is a basic-tier rule: pair colour with text, symbol, pattern or shape, test with a colour-blindness simulator, and prefer per-element colour choice over full-screen filters [V] ([gameaccessibilityguidelines.com](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-colour-alone/)).

**Apple HIG.** 44 × 44 pt minimum hit target on iOS and iPadOS, body text at 17 pt by default [S] (the HIG pages render with JavaScript and could not be fetched; [accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)).

### The web on an iPad

**Animating in the browser.** Animate only `transform` and `opacity`; in web.dev's example the `top`/`left` version dropped about half its frames against about 1% for `transform`; blurred effects are slow to paint; use `will-change` only around a change, not permanently [V] ([web.dev](https://web.dev/articles/animations-guide)).

**`backdrop-filter`.** WebKit's own introduction warns it forces extra rendering passes and should be used where most needed [V] ([WebKit](https://webkit.org/blog/3632/introducing-backdrop-filters/)). Fade the element's opacity rather than animating the blur radius [S] ([OpenReplay](https://blog.openreplay.com/creating-blurred-backgrounds-css-backdrop-filter/)).

**DOM labels over a 3D canvas.** CSS2DRenderer-style labels cost a DOM write per label per frame and grow with count; canvas-texture labels scale better but blur when close and need a re-upload on change [S] ([IGC](https://www.intelligentgraphicandcode.com/development/threejs-interfaces/html-integration)). No current benchmark was found; measure in Boogle.

**Magic Keyboard and trackpad.** On iPadOS Safari, `(any-hover: hover)` was reported to match with a trackpad from 15.2 while `pointer: fine` did not, and `:hover` fires from the trackpad pointer [S] ([WebKit bug 209292 thread](https://lists.webkit.org/pipermail/webkit-unassigned/2020-March/916274.html)). An iPad player can use keys, trackpad and touch in one minute.

**Haptics.** iOS browsers do not implement `navigator.vibrate()`; a hidden `<input type="checkbox" switch>` trick triggers the system tick, but only on a user tap, and one library reports Apple closed it in iOS 26.5 [S] ([ios-haptics](https://github.com/tijnjh/ios-haptics), [web-haptics notes](https://www.mintlify.com/lochie/web-haptics/advanced/browser-support)). Treat haptics as absent on the main device.

## What this means for Boogle

### Where the UI stands today

- **One look, mostly.** Tokens in [src/style.css](../../src/style.css): `--ink #13243f`, `--paper`, `--sun #ffc93d`, `--sea #0f9fc0`, `--sky`, a dark `--glass` with blur, Lilita One for display and Figtree for body. Two families of component: paper stickers with a 3 px ink border and a hard ink drop shadow (the interact prompt, the Enter button, the pause cards), and glass pills (hotbar names, the corner menu button). The haul chip is the odd one out: `system-ui` font and a brown that is not a token ([haul-stack.css](../../src/features/haul-stack.css)).
- **Motion exists but is ad hoc.** The prompt pops with `cubic-bezier(0.34, 1.56, 0.64, 1)` over 260 ms, the hotbar note shakes 360 ms, the pause card slides in 220 ms, the Enter button presses 3 px in 80 ms, the haul chip fades 200 ms. Each file names its own curve and duration. `prefers-reduced-motion` is respected where there is motion.
- **The HUD is silent.** Honk, ping, impact and the prototypes use the shared context in [src/render/audio.ts](../../src/render/audio.ts); the hotbar, prompt, haul chip, pause view and first-run card play nothing.
- **Text is small for the main device [C].** XAG's mobile rule (18 px glyph height at 100 DPI, linear in DPI) on a 264 ppi iPad Pro at device pixel ratio 2 gives about 24 CSS px of glyph height, roughly a 24–25 px font size. The PC rule is gentler, about 18 px. Hotbar names, notes and glass pills are 13 px; the haul chip 14 px; the prompt 18 px; pause rows 15–18 px. An iPad on a Magic Keyboard sits at laptop distance, so the PC figure is a fair floor and the tablet figure a fair target for anything read mid-play.
- **Contrast mostly passes [C].** White on `--glass` is about 4.8:1 over sky or sand but 4.0:1 over white (clouds, foam, the bright sea), ignoring the blur; the haul chip is 4.9–5.6:1; the red hotbar note 4.4:1; the blocked prompt 2.8:1, fine for disabled text. The work-site rings are told apart by colour (gold Track, green Helper) and position only.
- **Touch targets are generous.** Touch buttons are 64–76 px, the corner menu button 44 px minimum; the first-run close button is drawn at 28–32 px inside a 44 px hit area.
- **World-space UI already exists.** The interact prompt is a DOM sticker placed over the target each frame; pings are DOM; plaques at work sites are `CanvasTexture` sprites in the scene. The design record's departures board ([boogle-2.md](../proposals/boogle-2.md), "Stations are the fast-travel board") is a natural diegetic UI.

### A small UI style guide (proposal)

**Principle.** Each piece of information is either in the world or a crisp sticker on the glass, never a faint panel. Shared progress (sections laid, eras, plaques, timetables) leans to the world, where friends can stand round it together, as with Sea of Thieves' map table. Things only you need (what you carry, your tier, controls) are stickers.

**Type.**

| Role | Font | Size (CSS px) | Use |
| --- | --- | --- | --- |
| Display | Lilita One | 40–56 | Pause title, bell countdown, era names |
| Heading | Lilita One | 26–30 | Card titles, toast headline |
| Action | Lilita One | 20–22 | Prompt verb, button labels, hotbar item name |
| Body | Figtree 700 | 18–20 | Anything read during play: notes, chips, counts |
| Detail | Figtree 600 | 15–16 | Only inside a paused view (guide detail rows, room list) |

Numbers use `font-variant-numeric: tabular-nums` so tick-ups don't wobble. Sentence case, short verbs ("Take logs", "Start the machine"). Text scales with one root variable so a later text-size option is one number.

**Colour.** Keep the five tokens. Add three named ones instead of loose hex values: `--wood` (the haul chip's brown, so material chips can share a shape), `--leaf` (positive, growth, the Helper ring) and `--coral` (refusal, today's `#d8432f`). The glass behind running text gets about 0.7 opacity so white stays above 4.5:1 over clouds and foam. Colour is always the second signal: rings, tiers and states also get an icon or shape (a rail for Track, a hut for Helper).

**Shape.** Two components only. A *sticker* (paper, 3 px ink border, radius 999 px or 16 px, hard 3–5 px ink drop shadow) is for things you can press or that point at the world. A *glass pill* (no drop shadow) is for read-only status. Following the Fall Guys critique, the hard shadow means "pressable", so status chips lose it.

**Motion.** One set of tokens shared by all features:

| Token | Value | For |
| --- | --- | --- |
| `--dur-press` | 80 ms | press-in on key, pad or tap |
| `--dur-pop` | 240 ms | something arriving (prompt, chip, toast) |
| `--dur-leave` | 160 ms | anything leaving (always shorter than arriving) |
| `--dur-panel` | 220 ms | pause and cards |
| `--ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | menus, panels, fades |
| `--ease-pop` | a `linear()` spring, overshoot about 8%, settles by 70% | arrivals and counts |
| `--ease-squash` | press: scale 0.92 / 1.06 wide, back with `--ease-pop` | presses |

Overshoot on arrivals and presses only, never on panels or text blocks. Every press shows something within one frame. Under `prefers-reduced-motion`, pops become 120 ms fades and shakes become a colour flash.

**Sound on interaction.** One small kit, synthesized in WebAudio like honk and ping, routed through the existing master: *tick* (hotbar select, menu move; 40–60 ms, short pitch steps by slot), *pop* (prompt appears, chip appears; 80–120 ms, up-pitched), *thunk* (confirm, take, pour; 120–180 ms, low and woody to match logs), *deny* (blocked, full; a falling two-note, 200 ms), *count* (each increment; pitch rising with the run, resets after a pause). ±4% random pitch on every play; UI sits 6–10 dB under world sounds; prompt *pop* is rate-limited so walking past palms doesn't chatter. Nothing on hover. Where a music clock exists later, Hi-Fi Rush suggests quantizing UI ticks to it.

**Haptics.** None on iPad web; pad rumble for confirm and deny only where the browser exposes it (not checked). Sound and squash carry the feel.

**iPad touch sizes.** Hit areas at least 44 px (Apple's 44 pt) and 64 px for anything pressed mid-play, which Boogle already does; at least 8 px between neighbours; the thumb arcs at the lower corners are for actions, the top edge for read-only status. With a Magic Keyboard, `:hover` fires from the trackpad, so hover states should be real but never carry information.

### The five highest-impact UI changes, ranked

1. **A UI sound kit.** Every HUD touch makes a fitting little sound (the Nintendo and Mario Maker lesson, and the cheapest juice there is). Today the HUD is silent, so this changes the feel of every minute of play.
   *Smallest prototype:* `src/render/ui-sound.ts` with five synthesized voices over `getAudio()`, wired to hotbar select (tick by slot), prompt appearing (pop), Take logs (thunk), "Hotbar full" (deny) and the haul count (count), behind `?proto=uisfx` so it can be A/B'd in one session.

2. **One motion vocabulary, with press feedback everywhere.** Shared duration and easing tokens, plus a squash-and-release on whatever you pressed: the prompt sticker squashes when E is pressed, the hotbar slot bounces on 1–5, touch buttons squash under the finger. Players read "it heard me" before the result lands, which matters when lockstep results arrive a few hundred milliseconds later.
   *Smallest prototype:* the motion tokens and the `linear()` spring in `:root`, then press feedback on the prompt alone (it already has a pop), compared side by side with today's.

3. **A haul count that ticks and pops.** The haul chip is the number the core loop is about (Hodent: pin the number players keep checking). Make it a sticker with a log icon, count up one by one with a *count* sound and a small pop as the host confirms each pickup, and squash down as you pour; full (60) gets its own colour and word. Number tick-ups are the cheapest "satisfying" a resource loop gets.
   *Smallest prototype:* restyle `.haul-chip` into the type and colour tokens, then tween the displayed number toward the confirmed one over about 300 ms with a scale pop per step, only in [src/features/haul-stack.ts](../../src/features/haul-stack.ts).

4. **A legibility pass for the iPad.** Raise running text to the body size above (18–20 px), keep 15–16 px for paused views only, thicken the glass behind white text, and add a shape to the coloured work-site rings. Players on the main device at laptop distance read the HUD without leaning in, and colour-blind players can tell the rings apart.
   *Smallest prototype:* one `/look` still at an iPad Pro 11" viewport (1194 × 834) before and after changing font sizes in the hotbar, haul and first-run CSS; check each pill's contrast over the brightest part of the sky.

5. **One quiet notification lane, world first.** A single toast slot (one at a time, queued, de-duplicated, 2.5 s, never over the crosshair or prompt) for things only you need to know, while shared news lives in the world: the plaque updates with a puff, the departures board flips, The Boogler or a bystander says it (Mario Wonder's flowers). This keeps Boogle from nagging as systems pile up (Fortnite's lesson that narrated tips are forgotten anyway), and it puts shared progress where friends can point at it.
   *Smallest prototype:* move the hotbar note and the update toast onto one `notify(text, { kind, key })` helper with a queue and a cap, and give the plaque a flip and a sound when a pour is credited; no new systems.

Also worth a look later: the pause view as a toy (the island keeps running behind it, so the card could lean with the pointer and the character could pose, as Persona's menu does); a pocket notebook that holds the guide and collected things in Tunic's manner; the departures board as Boogle's map table; UI that pulses with a music clock once there is music.

### DOM or canvas in a WebGPU game

- **Keep the HUD and menus in the DOM.** Text, focus, `<dialog>`, screen readers, CSS layout and the control registry's generated guide all come free. The cost is compositing DOM layers over the canvas, which is small when the layers are few and only `transform` and `opacity` change.
- **Animate only `transform` and `opacity`.** Never `top`, `left`, `width`, `height`, `box-shadow` or `filter` in a loop. Press squashes are `scale`; the hard drop shadow press is a `translate` of the sticker, not an animated `box-shadow`. CSS animations and transitions are preferable to per-frame JavaScript for UI motion, since the browser can run compositor-only ones without the game's main-thread frame (not checked on WebKit here).
- **Use `backdrop-filter` sparingly [C].** There are seven today. Over a WebGPU canvas that changes every frame, each blurred element re-blurs its area every frame, and the blur can never be cached. On an M4 that is probably affordable for a few small pills; a full-screen blur under the pause view is the one to measure. A slightly more opaque glass with no blur reads almost the same and costs nothing. Don't animate the blur radius; fade the element.
- **World-anchored DOM is fine in small numbers.** The prompt and pings write one `transform` per frame and read no layout, which is the right pattern. Keep it for a handful of elements that need crisp text and a glyph (the prompt, a ping, one focused label). Avoid reading layout (`getBoundingClientRect`, `offsetWidth`) inside a frame.
- **Many labels, or labels that should hide behind things, go in the scene.** Name tags for 8 players, plaques, signs, the departures board and timetables belong in WebGPU as sprites or meshes with a `CanvasTexture` (as the plaques already are), redrawn only when their text changes, so they get depth, fog and occlusion for free and cost no DOM work. Size the canvas for the closest reading distance to avoid blur. For many dynamic labels, an SDF text atlas in TSL is the step after that.
- **Measure on the device.** Safari's responsive mode does not reproduce compositing. A `/look` run or `npm run perf` with the HUD visible, and a real iPad session with Web Inspector's layers and timeline, settle each of the above.

## Sound (2 November 2026)

*Added after the owner's listening-pack audit (docs/playtests.md, 2026-11-02): hotbar tick, "it worked" thunk, plaque flap, ping, ball boing, double jump and honk. Short pass; no Epic or Nintendo audio talk on these exact sounds was found.*

- **Fortnite.** Its audio designers say UI sound is among the hardest, most subjective work and that it shouldn't stand out from the game [S] ([Game Rant interview with Gary Miranda](https://gamerant.com/fortnite-spider-man-2-interview-good-sound-design-how/)). As played: the item-slot select is one short, soft, unpitched-feeling tick, the same for every slot; jumps and glider deploys are cloth and air (a filtered puff or flutter), not pitched voices [S, from play, not a source].
- **Nintendo Switch.** The HOME menu uses a small named set (select, tick, enter and back, error) that stays consistent everywhere [S] ([The Sounds Resource listing](https://sounds.spriters-resource.com/nintendo_switch/systembios/asset/411814/)); the clicks are crisp, very short and quiet [S].
- **Apple.** WWDC19's audio-haptic session argues a confirmation should sound like the physical object it stands for (the Apple Pay chime as the worked example), and a sound and a haptic belong together only when their shapes match [S] ([WWDC19 session 810](https://developer.apple.com/videos/play/wwdc2019/810/)).
- **General UI sound guides.** 80–300 ms; finish before the next action; 6–12 dB under the music's peaks; a little pitch or timbre variation to avoid fatigue [S] ([sfxengine guide](https://sfxengine.com/blog/best-practices-for-game-ui-sounds)).
- **Journey.** Four singing types by press (coo, chirp, call, shout); the sounds are re-pitched birds plus composer-written musical parts per type, written to complement each level's score; a companion nearby gets rising variations while you get falling ones [V] ([Steve Johnson, The Sound Design of Journey](https://www.gamedeveloper.com/audio/the-sound-design-of-i-journey-i-)). Pitch sets were chosen per section so they harmonise with the score [S] ([MCV/Develop](https://mcvuk.com/development-news/heard-about-journey/)).
- **Sky: Children of the Light.** Its developers keep sound effects and the music's key in step in real time so the result is consonant, and call that harder in an MMO than single-player [S] ([Automaton interview](https://automaton-media.com/en/interviews/20200307-631/)); the calls change key as you travel, so players can play along [S] ([Pocket Tactics](https://www.pockettactics.com/sky-children-of-the-light/music)); each call has regular, deep and partial-press versions [S].
- **Animal Crossing.** Animalese varies by personality, mood and species (size), not by the music's key [S] ([Nookipedia](https://nookipedia.com/wiki/Animalese)): a voice is identity, variation keeps it alive.

**For Boogle [C].**
1. Hotbar tick: one fixed soft tone (no pitch per slot), about 40 ms, well under the world; or none. The slot's pop animation already says which slot.
2. "It worked": a short pitched wooden knock (a marimba-like tok with a soft low body), the physical object it stands for; no noise burst.
3. Double jump: an air puff (band-passed noise, rising slightly), no pitched whoop.
4. Ping and ball boing: same identities, lower levels, softer attacks, shorter tails.
5. Honks: like Sky and Journey, pick the pitch from a set that changes slowly over shared time, so every honk is in the same chord as everyone else's; vary the shape per press (Sky's call variants), keep the voice per player (Animal Crossing).

## Not checked

- No designer interview was found for Fall Guys' menus, Fortnite's HUD redesigns, Sea of Thieves' map table, Animal Crossing's NookPhone, Death Stranding's notifications or the Switch's system sounds; those findings rest on critiques and fan sources.
- Apple's HIG numbers (44 pt, 17 pt) come from search summaries, since the pages render with JavaScript.
- Nothing was measured on an iPad: the `backdrop-filter` and DOM-label costs above are reasoning from the sources, not timings.
- Gamepad rumble support in Safari was not checked.
