# UX patterns for pause menus and controls guides in non-pausing (multiplayer, cozy) games

Scope: what a good pause view and controls guide contain, how they are structured, and how they behave, for a small third-person 3D multiplayer browser game (keyboard+mouse, gamepad, touch). Rebinding and full settings menus are out of scope; minimal expected options are noted briefly.

Source quality note: platform guidance (Xbox XAG, Apple HIG, Valve Steam Deck, MDN, Game Accessibility Guidelines) is primary and reliable. Claims about how specific commercial games behave were hard to source well. Many search hits were wikis, forums or low-quality SEO sites, and these are flagged where used. Several named games (Celeste, Hollow Knight, A Short Hike, Astroneer, Journey, Sky, Fall Guys, Animal Crossing visitor menus) could not be verified and are listed under Gaps instead of being asserted.

## 1. How do multiplayer games handle "pause" when the world keeps running?

### Takeaway
In shared-world multiplayer the "pause menu" is a local overlay. The world keeps simulating, and only the pausing player's input is diverted to the menu. True pausing happens only when the player is effectively alone: single-player, a self-hosted world with nobody else connected, or a mode that removes the character from the world. Games protect idle players weakly or not at all (they can be eliminated in Fortnite), and long idleness ends in an AFK kick (Sea of Thieves, roughly 10 minutes per community sources). Cozy games have no danger, so the open question is only social signalling.

### Cited Findings
- **Why shared worlds can't pause:** synchronous online games cannot pause because one player pausing would interrupt the other players acting in the same space — [Journal of Games Criticism (Schmalzer)](https://gamescriticism.org/wp-content/uploads/2023/07/schmalzer-4-1.pdf)
- **The tension an unpaused menu creates:** a menu that doesn't pause forces the player to keep watching their character's surroundings while navigating it — [Giant Bomb concept page "Menus Don't Pause Gameplay"](https://giantbomb.com/menus-dont-pause-gameplay/3015-7485/) (community wiki)
- **Indie multiplayer design that keeps the flow:** a multiplayer devlog describes a deliberately non-pausing menu so play isn't disrupted for others — [Plague Wardens devlog, itch.io](https://boardgamers2409.itch.io/plague-wardens/devlog/802424/front-end-user-experience-design-ryan-brown)
- **Minecraft Java:** "The game completely freezes when the game menu is opened in singleplayer." In multiplayer the menu's last button becomes **Disconnect** instead of Save and Quit, and a Social interactions / Player Reporting button appears. The wiki does not explicitly state the multiplayer non-pause, but it limits the freeze to singleplayer — [Minecraft Wiki, Pause menu](https://minecraft.wiki/w/Pause_menu)
- **Minecraft Bedrock:** a setting can turn off pausing in singleplayer (added around 1.21.60–1.21.70; not on Switch). Minecraft Education does not pause at all unless a teacher pauses it through Classroom Mode, an example of authority-controlled pause — [Minecraft Wiki, Pause menu](https://minecraft.wiki/w/Pause_menu)
- **Valheim:** vanilla pauses only when you host the world yourself and nobody else is connected. On a dedicated server the menu never pauses, and a community mod (PauseMyServer) exists to pause when you're the only one online — [Thunderstore PauseMyServer](https://thunderstore.io/c/valheim/p/DeathMonger/PauseMyServer/). Player reports conflict on the solo-on-dedicated case — [Steam discussion](https://steamcommunity.com/app/892970/discussions/0/3185738755274022102). Dedicated-server time stops when no players are online — [Supercraft Valheim guide](https://supercraft.host/wiki/valheim/guide/)
- **Fortnite Battle Royale:** no pause; an idle character stands still and can be eliminated — [Screenwise parent guide](https://screenwiseapp.com/guides/why-fortnite-feels-impossible-to-pause) (secondary source).
- **Overlay priority bug as a cautionary example:** in Fortnite Creative/UEFN, friend-request pop-ups took priority over the pause menu and blocked it from opening — [Unreal Engine forum bug report](https://forums.unrealengine.com/t/friend-request-pop-ups-prevent-opening-the-pause-menu-and-can-block-in-game-controls-when-spammed/2724374) (user report)
- **Sea of Thieves:** no pause for solo players, and an AFK kick ("Lazybeard") after about 10 minutes of inactivity. Some players report it sooner. Not exempt on Safer Seas — [Steam discussion, Feb 2024](https://steamcommunity.com/app/1172620/discussions/5/4200238624232188316); timer figure from [ExpertBeacon](https://expertbeacon.com/how-long-is-the-afk-timer-on-sea-of-thieves/) (low-authority, unofficial)
- **Roblox:** the platform escape menu (Esc) is built in, with default Players, Help, Report and Settings tabs per the DevForum. A Reddit user describes its buttons as Leave, Reset and Resume — [r/roblox weekly thread (mirror)](https://lr.ggtyler.dev/r/roblox/comments/1fiisyh/rroblox_weekly_question_thread_for_09162024/lnzst3q/?context=3). Developers can't fully remove it, and a DevForum proposal asked that any custom pause menu keep a "Leave" button — [Roblox DevForum "Edit Escape Menu"](https://devforum.roblox.com/t/edit-escape-menu/77986/12). Developers can disable Reset via `SetCore("ResetButtonCallback", false)` — [DevForum](https://devforum.roblox.com/t/how-to-disable-reset-character/1343826)
- **Animal Crossing: New Horizons:** the host ends an online session with the minus button, which sends all visitors home. The host can close the gate (via Orville) without kicking the players already there — [GameRevolution](https://www.gamerevolution.com/guides/653415-animal-crossing-new-horizons-kick-players-online), [Nintendo support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/49136)
- **Accessibility counterpoint:** GAG (Advanced) says "Do not make precise timing essential to gameplay – offer alternatives, actions that can be carried out while paused" — [Game Accessibility Guidelines, full list](https://gameaccessibilityguidelines.com/full-list/)

### Inferences
- For a cozy browser game where a peer is the host, the expected model is a **local, non-blocking overlay**. The world keeps rendering and simulating, while the player's movement/camera input is suppressed. Dimming or blurring the world behind it signals "you're in a menu", and leaving the world visible signals "the world is still live".
- Low-stakes worlds don't need protection like invulnerability, but **showing other players that someone is "away"** (an idle pose, a badge or a zzz over their head) is a cheap social courtesy. It fits an Owner-synced presence field. No primary source documents a specific game's away-indicator; see Gaps.
- Menu-only actions should not be time-critical, which matches the GAG timing guideline.
- Because the menu is local, other overlays (chat, toasts, join notifications) should never steal focus from or block the pause menu (the Fortnite UEFN bug).

### Gaps
- No primary source on Journey, Sky: Children of the Light, Fall Guys or Animal Crossing visitor-side menu behavior (for example whether opening the NookPhone/map pauses a visitor's game). Unverified recollections, not to be asserted without checking: Sky shows a sleeping/idle pose for AFK players, and Journey's pause leaves the companion in the world.
- No source documents a mainstream game that broadcasts an "in menu / away" status to others. Roblox and Minecraft show no such indicator by default as far as the sources say.
- LEGO Fortnite reportedly lets you leave the world via settings/lobby, which in effect pauses it; the guide making this claim wasn't identified, so it is unverified.
- Official AFK-timer values (Sea of Thieves, Fortnite) are not published. Figures come from community sites.

## 2. What sections/content do well-regarded pause menus have, and in what order?

### Takeaway
Across sources, the order is the same: **Resume first**, then reference and secondary items (help/controls, social or players, settings), then the **exit action last**, labelled for the context (Disconnect / Leave, not Quit, in multiplayer). Multiplayer adds a social or players section (who's here, reporting, invite or server links). The menu must be fully navigable with the same input as gameplay, keep the same "back" button everywhere, and wrap focus in linear lists.

### Cited Findings
- **Minecraft Java game menu order:** Back to Game, Advancements, Statistics, Feedback/Bugs, Friends, Social interactions (multiplayer only), Server Links, Options, World Options (contains Open to LAN), and finally Save and Quit to Title (singleplayer) or **Disconnect** (multiplayer) — [Minecraft Wiki](https://minecraft.wiki/w/Pause_menu)
- **Minecraft Bedrock:** Resume Game first, then Realm Hub, Marketplace, Settings, Save & Quit, Achievements, **How to Play** (an in-menu help reference), Screenshot, Dressing Room, and Social (also bound to F4) — [Minecraft Wiki](https://minecraft.wiki/w/Pause_menu)
- **Don't Starve Together** (co-op, world keeps running): Continue, Options, Disconnect, with a confirmation before quitting — [DST API docs, pausescreen](https://vietnd69.github.io/dst-api-webdocs/docs/game-scripts/screens/pausescreen) (community docs of game scripts)
- **Roblox:** Leave / Reset / Resume buttons ([Reddit mirror](https://lr.ggtyler.dev/r/roblox/comments/1fiisyh/rroblox_weekly_question_thread_for_09162024/lnzst3q/?context=3)) plus Players, Help, Report, Settings tabs ([Roblox DevForum](https://devforum.roblox.com/t/edit-escape-menu/77986/12))
- **Generic template (Unity tutorials):** pause menus typically offer resume, restart and return to main menu — [SitePoint](https://www.sitepoint.com/adding-pause-main-menu-and-game-over-screens-in-unity/)
- **Breath of the Wild:** the pause screen is split into Adventure Log, Inventory, System and Map — [Zelda Wiki, Subscreen](https://zelda.fandom.com/wiki/Subscreen). A separate Controls menu (Ability/Special Controls) exists; which subscreen it sits under was not verified.
- **XAG 112 (UI navigation), applicable rules:**
  - Interaction prompts stay consistent ("A" to select, "B" for back, LB/RB tabs) and sit in the same place on every screen (Sea of Thieves puts select/back prompts at the bottom-left).
  - Always provide a way back ("press B to go back").
  - The UI is fully navigable by keyboard and controller *digital* input alone. Grounded's menus, including Quit, can be reached with Tab/arrows and Space.
  - **Focus wraps** from last to first in linear menus, but not in grid menus.
  - Repeated components appear in the same relative order on every screen.
  — [Xbox Accessibility Guideline 112](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/112)
- **XAG 107 (Input):**
  - "A UI should be navigable by using single, non-simultaneous key presses."
  - Keyboard players must be able to start, adjust settings, play and **exit** with keyboard alone.
  - Activation on the up event (mouse-up / touch-end) with a way to cancel by sliding off.
  - Phone touch targets at least 15 mm (tablets 24 mm).
  — [XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)
- **Apple HIG UI conventions for controllers outside gameplay:** A activates, B cancels or goes back, shoulders switch tabs/sections, stick/D-pad move selection, and **Menu opens game settings or pauses gameplay**. Home/logo is reserved for the system. On touch, secondary controls like menus go at the top of the screen with a minimum size of 28x28 pt (44x44 pt for frequent controls) — [Apple HIG, Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)
- **GAG Basic:** ensure all UI can be accessed with the same input method as gameplay — [GAG full list](https://gameaccessibilityguidelines.com/full-list/)
- **Minimal options commonly expected:**
  - Look sensitivity, adjustable by at least ±50% (XAG 107 asks for this).
  - Invert Y (XAG 107 lists axis inversion).
  - Readable default text size and high contrast (GAG Basic).
  — [XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107), [GAG full list](https://gameaccessibilityguidelines.com/full-list/)

### Inferences
- A recommended order for this game's pause view:
  1. **Resume**, focused by default.
  2. **Controls / How to play.**
  3. **Room**: room name, copy/share invite link, list of players present.
  4. **Sound**: one master volume slider or a mute toggle.
  5. **Leave room**, last. Use "Leave", not "Quit", and add a confirm step if it is destructive.
- The "first item = Resume, last item = exit" convention is consistent across Minecraft (both editions), Roblox and DST. Pressing the open key again or Back/B/Esc also resumes.
- Keep the header short and show the room or session context there (Minecraft swaps Save&Quit for Disconnect in multiplayer, which shows that multiplayer context changes the labels).

### Gaps
- No authoritative study found on the "Resume first" convention as such. It is inferred from consistent examples.
- Game UI Database (gameuidatabase.com) pages could not be retrieved through search; no citations from it.
- No primary source found specifically listing master volume as a minimum expected option, though it is near-universal in practice.

## 3. Controls guide patterns

### Takeaway
Use layered disclosure. First, **context-sensitive prompts** at the moment of need ("press X to …"). Second, an optional **small persistent hint or legend** for the core verbs. Third, a **full reference screen** reachable from the pause menu, grouped by activity, that shows **only the active device's glyphs** and switches instantly when the player changes device. Reveal or teach mechanics as they unlock (BotW only lists abilities once discovered). For touch, label buttons with icons of the action, not controller letters.

### Cited Findings
- **GAG Intermediate, "Indicate / allow reminder of controls during gameplay":**
  - Rationale: "Complex controls can sometimes be difficult to recall for any player, but especially with impaired memory."
  - Covers reminders of basic controls and summaries of mechanics taught in tutorials.
  - A player testimonial asks for controls shown on the HUD.
  - Examples cited: Everybody's Gone to the Rapture (simple controls) and XCOM: Enemy Unknown (help screens).
  — [GAG](https://gameaccessibilityguidelines.com/indicate-allow-reminder-of-controls-during-gameplay/)
- **Related GAG items:** "Include contextual in-game help / guidance / tips" (Intermediate); "Include interactive tutorials" (Basic); "Give a clear indication that interactive elements are interactive" (Intermediate) — [GAG full list](https://gameaccessibilityguidelines.com/full-list/)
- **Breath of the Wild, progressive disclosure:** the Controls ("Ability/Special Controls") menu lists Link's actions, but "each Special control must first be revealed through gameplay before becoming visible on the menu" — [Zelda Wiki, Special Controls](https://zeldawiki.wiki/wiki/Special_Controls)
- **Untitled Goose Game, teach the one verb in context:** the game opens with an on-screen instruction to press the honk button, and honking pulls the goose out of the bush. The bindings are few: move, honk, run, interact, crouch, flap, zoom, pause, to-do list — [Nintendo World Report review](https://www.nintendoworldreport.com/51756), [TrueAchievements walkthrough](https://www.trueachievements.com/game/Untitled-Goose-Game/walkthrough/1)
- **three.js PointerLockControls reference example:** a full-screen "blocker" overlay reads "Click to play" with a minimal legend ("Move: WASD / Jump: SPACE / Look: MOUSE"). It shows on unlock and hides on lock, which merges onboarding, pause and controls reference into one screen — [three.js examples/misc_controls_pointerlock.html](https://github.com/mrdoob/three.js/blob/dev/examples/misc_controls_pointerlock.html)
- **Context-sensitive commands** work best when one specific command is needed in a situation. Assassin's Creed's "paper doll" shows what each button does right now — [Game Wisdom](https://game-wisdom.com/?p=16717)
- **Diagram vs. bare glyph:** a commenter argues for showing a button in the context of the buttons around it (its position on the controller), not just flashing its symbol — [University XP](https://www.universityxp.com/news/tag/consoles) (weak source)
- **Glyphs follow the active device:**
  - Track the last-used device and swap prompts immediately on change — [Bugnet, input prompts showing wrong device](https://bugnet.io/blog/how-to-fix-input-prompts-showing-the-wrong-device)
  - Developers cite Fortnite as the model for on-the-fly prompt switching — [Unreal forum](https://forums.unrealengine.com/t/best-way-to-switch-out-button-prompts-when-the-player-changes-from-mouse-and-keyboard-to-controller/323816)
  - Track mouse button separately from keyboard key — [StevesUEHelpers InputImage](https://git.starforge.co.uk/Mirrors/StevesUEHelpers/src/branch/master/doc/InputImage.md)
- **Steam Deck Verified:** with physical controls, on-screen glyphs must match Deck or Xbox 360/One button names, and mouse/keyboard glyphs must not show unless those are the active input. Text entry must work with a controller alone, through the on-screen keyboard API or built-in entry. Failing these typically drops a game to "Playable" — [Steamworks, Steam Deck compatibility](https://partner.steamgames.com/doc/steamdeck/compat)
- **Apple HIG, glyphs and labels:**
  - Use the connected controller's labeling scheme.
  - With several controllers connected, use the glyphs of the one the player is actively using.
  - Prefer symbols over text for controller elements.
  - On touch, "Avoid using abstract shapes or controller-based naming like A, X, or R1 as artwork". Use icons of the action.
  - Show and hide virtual controls to reflect context.
  - Movement on the left half, camera on the right half; a floating thumbstick where the thumb lands; direct-touch camera pan.
  — [Apple HIG, Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)
- **Apple HIG, keyboards:** prefer single-key commands, mnemonic letters ("I for Inventory or M for Map"), the main action on Space, and secondary commands near WASD — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/game-controls)
- **XAG 107:** when controls change, the new mapping must be reflected across all hints, tips, tutorials and controller maps. This applies by extension to device switches: prompts must never go stale — [XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)
- **XAG 112:** the same action keeps the same prompt everywhere ("Press A to select") — [XAG 112](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/112)

### Inferences
- For this game, structure the full controls reference as **activity groups**: Move (move, jump, sprint), Camera (look, zoom), Interact (the one interact button and what it does), Build/Tools (if applicable), Social/Room (chat, emotes, menu). Each row reads action verb, then the glyph for the **current** device. Add a small device switcher or tabs (Keyboard / Gamepad / Touch) for players who want to look up another device, but default to the active one.
- A gamepad diagram helps when the pad is active, since buttons are positional. A two-column list suits keyboard. Touch is best explained by labelling the on-screen buttons themselves, or a one-time annotated overlay.
- Keep the pause-menu controls page and the in-world prompts generated from one action registry (Boogle's `registerAction` in `src/player/controls.js` already centralizes actions and pad slots), so labels can't drift. This follows XAG 107's "hints must reflect mapping".
- First-time onboarding should be the **same content as the reference**, shown once (three.js "Click to play" pattern), then reachable from pause any time.

### Gaps
- No primary source found for how Celeste, Hollow Knight, A Short Hike or Astroneer present controls. Unverified recollections, which the writer should not assert as fact: Celeste teaches through level design with few prompts; Hollow Knight shows a controls diagram in its options; A Short Hike uses brief contextual prompts.
- No empirical data (playtests, A/B) found comparing persistent corner legends vs. on-demand reference screens.

## 4. Opening/closing conventions, pointer lock, onboarding vs. reference

### Takeaway
The standard bindings are Esc on keyboard, Start/Menu ("Options"/"+") on gamepad, and a small top-corner menu button on touch. The same key or Back/B closes. In browsers, Esc is owned by the browser for exiting pointer lock, so the game cannot intercept it while locked. The robust pattern is to **treat every pointer-lock loss as "open pause"**. Resuming then requires a click (an engagement gesture), which is also how you get around the relock cooldown. Never auto-relock.

### Cited Findings
- **Pointer lock exit and pointerlockchange:** "When the Pointer lock state changes—for example, when calling requestPointerLock() or exitPointerLock(), the user pressing the ESC key, etc.—the pointerlockchange event is dispatched to the document." — [MDN, Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)
- **Relock needs a new gesture:** "If a user has exited pointer lock via the default unlock gesture, or pointer lock has not previously been entered for this document, an event generated as a result of an engagement gesture must be received by the document before requestPointerLock will succeed." Errors fire `pointerlockerror` — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)
- **Options and promise caveat:** `requestPointerLock({ unadjustedMovement: true })` disables OS mouse acceleration and may throw `NotSupportedError`, in which case retry without it. `.then()` throws in older browsers where it returns undefined, so prefer `await` — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)
- **Relock cooldown:** after Esc, Chrome refuses relock for a short period. Community reports put it around 2 s ("wait for something like 2s"), and a Chromium bug discussion floated 2 s as a candidate timeout — [Babylon.js forum](https://forum.babylonjs.com/t/pointerlock-issues/14056), [three.js forum](https://discourse.threejs.org/t/three-pointerlockcontrols-unable-to-use-pointer-lock-api/18321). A spec contributor confirmed the app may not relock after Esc without a gesture — [W3C public-webapps-github, 2020](https://lists.w3.org/Archives/Public/public-webapps-github/2020Mar/0224.html). No official constant is documented.
- **Recommended browser pattern:**
  - "a visible 'click to play' affordance doubles as the gesture; auto-lock attempts on load always fail".
  - On unlock, pause and show a resume prompt; continuing to read input while unlocked causes a "spinning-camera bug".
  - Don't auto-retry relock.
  - Discard or clamp large first `movementX/Y` deltas after locking.
  — [Bugnet, pointer lock errors in browser FPS games](https://bugnet.io/blog/how-to-fix-pointer-lock-errors-and-the-mouse-escaping-in-browser-fps-games)
- **three.js example:** unlock shows the blocker or instructions; clicking the instructions calls `controls.lock()` — [three.js misc_controls_pointerlock](https://github.com/mrdoob/three.js/blob/dev/examples/misc_controls_pointerlock.html)
- **Chromium mouse-lock design doc:** lists Esc among the exit paths for mouse lock — [Chromium, Mouse Lock](https://www.chromium.org/developers/design-documents/mouse-lock/)
- **Controller convention:** Menu button "Opens game settings or pauses gameplay", and B "Cancels an action or returns to previous screen" — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/game-controls)
- **XAG 112:** Grounded offers a reachable Quit item for players who "can't reach the Esc key" — [XAG 112](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/112). XAG 107 lists remapping "the Esc key on PC games" — [XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)
- **Touch:** put menus at the top of the screen, minimum 28x28 pt, clear of the safe area and Dynamic Island — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/game-controls)
- **Accessibility-first launch:** XAG 112 recommends prompting accessibility settings as the first screen on first launch (Minecraft Dungeons example) — [XAG 112](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/112). GAG Basic says the game should start without navigating multiple levels of menus — [GAG full list](https://gameaccessibilityguidelines.com/full-list/)

### Inferences
- A browser flow that combines these:
  1. On `pointerlockchange` to unlocked, open the pause overlay. This covers Esc, alt-tab and focus loss alike.
  2. Make the overlay's main area or Resume button the click that calls `requestPointerLock`.
  3. If `pointerlockerror` fires (cooldown), keep the overlay open and show "click again to resume" instead of retrying.
  4. A second Esc while the overlay is open should not try to relock (no gesture). Leave the overlay open or close it to an "unlocked, click world to look" state.
  5. On gamepad and touch, pointer lock isn't involved. Start or the menu button toggles the overlay directly.
- Also open pause on `visibilitychange` to hidden or window `blur`, so input never sticks when the tab loses focus (inferred; the Bugnet article does not cover blur).
- First-run: show the controls summary once as a "click to play" card for the active device, then make the same content available from pause. Don't gate play behind multiple menus (GAG Basic).

### Gaps
- No official Chrome, Firefox or Safari documentation on the exact relock cooldown duration.
- No source on mobile Safari or Chrome specifics for a fullscreen-plus-menu-button pattern in browser games.
- No source found on how popular .io games (Krunker, Shell Shockers, etc.) present their pause. Recollection only: many show a "click to play" splash with a controls legend, matching the three.js example.

## 5. Platform guidance summary

### Takeaway
The platform guidance agrees on a few rules:
- Every UI is reachable with the gameplay input, digital-only, single presses.
- Consistent confirm/back prompts in fixed positions.
- Focus wraps in linear menus.
- Glyphs match the active device, and keyboard/mouse glyphs are hidden when a pad is in use.
- Large touch targets that activate on release.
- Control reminders are available during play.

### Cited Findings
- XAG 112 (consistent navigation, back prompt always visible, focus wrap, digital-only navigation) — [XAG 112](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/112)
- XAG 107 (single non-simultaneous presses, activation on up event, avoid long holds, keyboard-only start-to-exit, touch target ≥15 mm on phones and ≥24 mm on tablets, simplified control schemes) — [XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)
- GAG: controls reminder during gameplay (Intermediate), contextual help (Intermediate), interactive tutorials (Basic), readable default font and high contrast (Basic), UI navigable with the gameplay input (Basic) — [GAG full list](https://gameaccessibilityguidelines.com/full-list/)
- Apple HIG: Menu opens settings or pause, A confirms, B goes back, shoulders switch tabs; glyphs of the active controller; symbols over text; touch buttons use action icons, not letters; menus at top, 28 pt minimum — [Apple HIG, Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)
- Steam Deck: Deck or Xbox glyphs only when the pad is active, and controller-only text entry — [Steamworks Deck compat](https://partner.steamgames.com/doc/steamdeck/compat)
- XAG current version noted as v3.2 (June 2023) — [XAG version history](https://learn.microsoft.com/ar-sa/xbox/accessibility/xag-version-history)

### Inferences
- In a browser, the Gamepad API reports the "standard" mapping, not the brand. The Xbox-style layout (A/B/X/Y) is the safe default glyph set, consistent with Steam Deck's allowance of Xbox names. Detecting PlayStation or Switch from `gamepad.id` is a nice-to-have.
- A room/share-link item needs no text entry. If any text entry exists (a name or chat), the Steam Deck rule implies it needs a controller-usable path.

### Gaps
- Google Play / Android game controller UI guidance was not retrieved.
- Game UI Database screenshots were not retrievable through search, so no visual catalogue citations.
