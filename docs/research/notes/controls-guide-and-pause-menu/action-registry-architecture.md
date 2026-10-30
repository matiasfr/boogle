# Data-driven action registry: controls guide, button prompts and touch buttons from one place

Context for the report writer: Boogle already has a small registry in `src/player/controls.js`:
`registerAction(id, { pad, label, down, up, held })`, one action per standard-mapping pad slot, clashes logged, `listActions()` / `freeSlots()`. `src/features/gamepad.js` builds its help card from `listActions()` (`[PAD_LABEL[a.pad], a.label]`), and `src/features/updates.js` copies `PAD_LABEL[pad]` into its own button text. Keyboard keys and touch buttons are bound elsewhere (`src/player/input.js`), not in the registry. The findings below are about growing that registry, not replacing it.

## 1. How engines and input middleware model actions, bindings, display strings, contexts and "last used device"

### Takeaway
Every mature system separates an action's identity (name, display name, category) from a per-device table of bindings, and generates prompts by asking "what is this action bound to on the active device?" rather than hardcoding a glyph. Contexts (action maps, mapping contexts, action sets/layers) decide which actions are live. For a small JS game, three ideas carry over: action id + metadata, bindings grouped by device kind, and a "current device kind" signal that UI subscribes to.

### Cited Findings
**Unity Input System**
- Display text comes from the binding, not from the UI: `action.GetBindingDisplayString()`, `action.GetBindingDisplayString(1)`, and `action.GetBindingDisplayString(0, out deviceLayout, out controlPath)`. The out-parameter form is described as "useful for reliably associating imagery with individual controls." — [Unity manual, Action Bindings](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/ActionBindings.html)
- The documented icon pattern: check `InputSystem.IsFirstLayoutBasedOnSecond(deviceLayout, "Gamepad")`, then switch on the control path (`buttonSouth`, `dpad/up`, ...) to pick a sprite; if no icon exists, show the text string. — [Unity manual, Action Bindings](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/ActionBindings.html)
- Bindings carry semicolon-separated "binding groups", "mostly used for Control Schemes"; a `bindingMask` on the map or asset enables a set of groups. — [Unity manual, Action Bindings](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/ActionBindings.html)
- Contexts: `PlayerInput.currentActionMap` / `SwitchCurrentActionMap(name)` switch the active action map. — [Unity manual, PlayerInput](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/PlayerInput.html)
- Last-used device: with a single active PlayerInput and `neverAutoSwitchControlSchemes` false, device pairing updates "automatically based on device usage"; the switch happens on input from a non-noisy, non-synthetic control, and a successful change raises `onControlsChanged`. Auto-switching is disabled when more than one PlayerInput is active. — [Unity API, PlayerInput 1.13](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.13/api/UnityEngine.InputSystem.PlayerInput.html)
- Known bugs: `onControlsChanged` stopped firing after disable/re-enable (fixed in 1.1.0-pre.5) — [Unity issue tracker](https://issuetracker.unity3d.com/issues/playerinput-dot-oncontrolschanged-event-will-no-longer-trigger-when-playerinput-gets-disabled-and-re-enabled); toggling `neverAutoSwitchControlSchemes` from script locked auto-switch onto one device — [Unity issue tracker](https://issuetracker.unity3d.com/issues/input-system-auto-switch-locks-on-one-device-when-its-disabled-and-re-enabled-via-script)
- Community practice (forum posters): subscribe to the controls-changed event and map the device to a type; one poster notes this cannot precisely distinguish controller models. — [Unity Discussions, "Last used device"](https://discussions.unity.com/t/last-used-device-x360-xone-ps4-dualsense-etc/859088); [Unity Discussions, "How to know if controller or keyboard?"](https://discussions.unity.com/t/how-to-know-if-controller-or-keyboard/869718)

**Godot InputMap**
- `InputMap` is a singleton of named actions, each with a list of `InputEvent`s and a deadzone: `add_action(action, deadzone = 0.2)`, `action_add_event(action, event)`, `action_get_events(action) -> Array[InputEvent]`, `get_actions()`, `has_action()`, `action_erase_events()`, `load_from_project_settings()`. — [Godot docs, InputMap](https://docs.godotengine.org/en/stable/classes/class_inputmap.html)
- The "Input Prompts" addon's `ActionPrompt` node "display[s] prompts based on the InputMap and an icon preference"; with "Automatic" the prompts update to match the input device. Separate nodes exist per raw input (`JoypadButtonPrompt`, `JoypadMotionPrompt`, `KeyPrompt`, `MouseButtonPrompt`). Icon sets: keyboard and mouse, Xbox, PlayStation, Switch; MIT, Kenney icons. — [Pennycook/godot-input-prompts](https://github.com/Pennycook/godot-input-prompts); [Godot forum announcement](https://forum.godotengine.org/t/input-prompts-automatically-display-icons-for-keyboards-or-controllers/58594)

**Unreal Enhanced Input and CommonUI**
- Input Actions are "the communication link between the Enhanced Input system and your project's code"; Input Mapping Contexts are "a collection of Input Actions that represents a certain context that the player can be in", added/removed per user with a priority; when several contexts map the same action, the highest priority wins. Modifiers (dead zones, axis swizzle) pre-process values; Triggers decide activation. — [Unreal docs, Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine)
- Player-mappable metadata lives on `UPlayerMappableKeySettings`: `Name` (unique save id), `DisplayName` (localized FText), `DisplayCategory` (FText grouping), and a `Metadata` object for related items such as icons. — [Unreal API, UPlayerMappableKeySettings](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/EnhancedInput/UPlayerMappableKeySettings); [Python API mirror](https://docs.unrealengine.com/5.2/en-US/PythonAPI/class/PlayerMappableKeySettings.html)
- Last-used device: `UInputDeviceSubsystem::GetMostRecentlyUsedInputDeviceId` — [Unreal API](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UInputDeviceSubsystem/GetMostRecentlyUsedInputDeviceId); CommonUI's `UCommonInputSubsystem::GetCurrentInputType` — [Unreal 4.27 API](https://docs.unrealengine.com/4.27/en-US/API/Plugins/CommonInput/UCommonInputSubsystem/GetCurrentInputType/index.html)
- CommonUI glyphs come from per-platform "controller data" assets with an input brush map per key; `UCommonActionWidget` exposes `HandleInputMethodChanged` / `UpdateActionWidget`. Forum reports: action widgets not refreshing until the input method changes (workaround: re-broadcast `OnInputMethodChangedNative`), keyboard icons missing inside activatable widgets, and some developers replacing `CommonActionWidget` with their own widget subscribed to the input subsystem. — [UCommonActionWidget API](https://docs.unrealengine.com/4.27/API/Plugins/CommonUI/UCommonActionWidget/index.html); [forum: widget doesn't work until switching](https://forums.unrealengine.com/t/common-action-widget-doesnt-work-until-switching-input-methods/1812980); [forum: Lyra keyboard icons](https://forums.unrealengine.com/t/lyra-commonui-how-to-enable-display-mouse-and-keyboard-input-icons-inputactionwidget/1277757); [forum: gamepad devices on PC](https://forums.unrealengine.com/t/common-ui-gamepad-devices-on-pc/2669565)

**Steam Input**
- Action sets are controller modes ("Menu", "Walk", "Drive"); `ActivateActionSet` is cheap and safe to call every frame; action set layers stack on top (`ActivateActionSetLayer`, `DeactivateActionSetLayer`, `DeactivateAllActionSetLayers`, `GetActiveActionSetLayers`). — [Steamworks ISteamInput](https://partner.steamgames.com/doc/api/ISteamInput)
- Prompts are resolved from what is bound: `GetDigitalActionOrigins` / `GetAnalogActionOrigins` return the origins for an action in an action set, to "display the appropriate on-screen prompt"; then `GetGlyphPNGForActionOrigin(origin, size, flags)`, `GetGlyphSVGForActionOrigin`, and `GetStringForActionOrigin` (localized name). `GetGlyphForActionOrigin_Legacy` is superseded. — [Steamworks ISteamInput](https://partner.steamgames.com/doc/api/ISteamInput)
- Steam warns that `GetActionOriginFromXboxOrigin` translates buttons directly and ignores the user's remapping; recommended: bounds-check origins, use `TranslateActionOrigin` for unknown values, try the game's own glyph art first and fall back to Steam's. `ESteamInputType` (from `GetInputTypeForHandle`) is fixed per SDK version while origins grow as controllers are added. — [Steamworks ISteamInput](https://partner.steamgames.com/doc/api/ISteamInput)

**Rewired (Unity middleware)**
- A widely shared glyph script asks the player for its last active controller (falling back to a platform default), iterates the `ActionElementMap`s for that controller and action, and maps the element id through the controller's template before looking up an icon. — [phosphoer gist](https://gist.github.com/phosphoer/87f87fe5f99c4331bd15d4b762e1a572)
- The third-party Rewired-Glyphs library has an explicit `Unbound` glyph type for an action with no mapped element. — [Rewired-Glyphs docs, Glyph.Type](https://orange-panda.github.io/Rewired-Glyphs/api/LMirman.RewiredGlyphs.Glyph.Type.html)

### Inferences
- The shared shape across Unity (action + bindings with groups), Godot (action -> events), Unreal (action + mapping contexts + mappable settings with display name/category), Steam (action -> origins per action set) and KAPLAY (section 2) is: **action identity and metadata** separate from **bindings per device kind**, plus **contexts** that enable subsets. Boogle's `registerAction` already has id + label + one gamepad binding; it lacks category, context, keyboard and touch bindings.
- "Ask the registry what is bound, then map binding -> glyph" (Unity, Steam, Rewired) is what keeps prompts correct after rebinding. Boogle's `updates.js` copying `PAD_LABEL[pad]` into its own button text at registration time is the hardcoded pattern the engines warn against.
- A missing-glyph fallback chain (own icon -> text label -> generic) and an explicit "unbound" state appear in Unity, Steam and Rewired; worth copying.
- Concepts that do NOT need to translate to a small JS game: triggers/modifiers pipelines, binding masks, per-player device pairing, priority-stacked contexts (a flat "current context" plus an "always" context likely suffices).

### Gaps
- Unity `InputBinding.DisplayStringOptions` values and the Rebinding UI sample's icon approach: not on the fetched page.
- Unreal `QueryKeysMappedToAction` (or equivalent) signature: not confirmed; only a Python doc mention of a function returning keys mapped to an action.
- Steam `ESteamInputGlyphStyle` enum values: not extracted.
- Rewired's official docs (`ActionElementMap`, `elementIdentifierName`, `GetLastActiveController`): only a gist and a third-party library were found.
- How the Godot Input Prompts addon detects the active device: README is silent.

## 2. Web/JS: Gamepad API, last-used-device detection, layout-aware key labels, touch controls, declarative registries

### Takeaway
The web platform gives you enough for a small registry: `KeyboardEvent.code` for layout-independent bindings, `navigator.keyboard.getLayoutMap()` (Chromium only) for layout-aware labels, `PointerEvent.pointerType` for touch vs mouse, and polled `navigator.getGamepads()` with `mapping === 'standard'` for pad input. Controller brand detection from `Gamepad.id` is unreliable and browser-dependent, so default to a neutral (or Xbox-style) glyph set and treat brand as a best-effort hint. Among JS libraries, KAPLAY's `buttons` config and contro's `.label` are the closest to a declarative action registry.

### Cited Findings
**Gamepad API**
- `gamepadconnected` fires on connect, or for an already-connected pad when the user presses a button or moves an axis; Firefox only exposes gamepads after the user interacts with one while the page is visible (anti-fingerprinting). — [MDN, Using the Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)
- Poll `navigator.getGamepads()` each frame and read the current object by `index` rather than keeping a reference; indices can be reused after disconnect. — [MDN, Using the Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)
- `mapping === 'standard'` means the browser remapped the device to the one known layout; buttons have `pressed` and `value` (0..1, analog triggers), axes are -1..1. — [MDN, Using the Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)
- `id` "is not strictly specified"; Firefox uses `vendor-product-name` with 4-digit hex IDs. — [MDN, Using the Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API); [MDN, Gamepad.id](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/id). The W3C draft recommends identifying the product (e.g. USB idVendor/idProduct) and forbids serial numbers or Bluetooth addresses. — [W3C Gamepad WD 2023-10-05](https://www.w3.org/TR/2023/WD-gamepad-20231005/)
- Chrome-format examples: `Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 05c4)`, `Pro Controller (Vendor: 057e Product: 2009)`. — [Enichan gist](https://gist.github.com/Enichan/de1618d2c481523bd0c1123800bfe747)
- Helper libraries map vendor/product to models (e.g. `054c` + `0ce6` -> DualSense) — [LizardByte gamepad-helper](https://docs.lizardbyte.dev/projects/gamepad-helper/latest/gamepad-helper.js.html); GameInput.js added a Sony vendor-level fallback so unrecognized `054c` pads get PlayStation glyphs, tested across Firefox and Chrome formats — [gameinputjs PR #82](https://gh.r-mj.com/lunarcloud/gameinputjs/pull/82). GameInput.js itself (MIT) exposes `player.getButtonText(section, button)` and a per-model `iconName`, but no notion of game actions. — [lunarcloud/gameinputjs](https://github.com/lunarcloud/gameinputjs)
- A developer's write-up: the same pad reports different names across drivers/browsers, the PS4 pad's browser string was not reliable for detection, and their plan was SDL `gamecontrollerdb` GUID lookup -> name substring -> generic "Button0" labels. — [silbinarywolf devlog, "You Can't Just: Query if a controller is for Xbox or PlayStation"](https://silbinarywolf.itch.io/give-up-the-dupe/devlog/257921/you-cant-just-query-if-a-controller-is-for-xbox-or-playstation)

**Keyboard labels**
- `navigator.keyboard.getLayoutMap()` resolves to a `KeyboardLayoutMap` keyed by physical `code`:
  ```js
  navigator.keyboard.getLayoutMap().then((map) => {
    const upKey = map.get('KeyW'); // 'z' on AZERTY
  });
  ```
  Secure context only, can throw `SecurityError` under a permissions policy, experimental and "not Baseline" (limited availability). — [MDN, Keyboard.getLayoutMap](https://developer.mozilla.org/en-US/docs/Web/API/Keyboard/getLayoutMap)
- The contro-max fork of contro switched keyboard handling to `event.code` so bindings work across layouts, which the original did not. — [contro-max README](https://cdn.jsdelivr.net/npm/contro-max@0.1.12/README.md)

**Pointer type**
- `PointerEvent.pointerType` is `"mouse"`, `"pen"`, `"touch"`, or `""` when undetectable. — [MDN, PointerEvent.pointerType](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType)

**Declarative registries in JS libraries**
- KAPLAY declares actions ("buttons") once, per device:
  ```js
  kaplay({ buttons: { jump: { keyboard: ['space', 'up'], gamepad: 'south' } } });
  onButtonPress('jump', () => player.jump());
  getButton('jump').keyboard;          // read bindings
  setButton('jump', { keyboard: ['w'] }); // shallow merge: gamepad binding kept
  pressButton('jump'); releaseButton('jump'); // virtual input (e.g. touch buttons)
  ```
  — [KAPLAY input guide](https://kaplayjs.com/docs/guides/input/)
- contro composes bindings and exposes a display label per control, read in the game loop:
  ```js
  jump: or(gamepad.button('A').trigger, keyboard.key('Space').trigger),
  statusOverlay: or(gamepad.button('RB'), keyboard.key('Tab')),
  // UI: button.textContent = controls.jump.label
  ```
  — [contro README](https://github.com/shroudedcode/contro); [npm contro](https://npmjs.com/package/contro)
- nipplejs: dependency-free virtual joystick (`nipplejs.create({ zone, mode, size, threshold, multitouch, ... })`, events start/move/dir/end); its zone must not be `position: static`. Version 0.10.x per npm. — [nipplejs GitHub](https://github.com/yoannmoinet/nipplejs); [npm nipplejs](https://npmjs.com/package/nipplejs)

### Inferences
- Last-used-device detection in plain JS (no single source covers this; synthesized from the APIs above): `keydown` -> `keyboard`; `pointerdown` with `pointerType === 'touch'` -> `touch`, `'mouse'` -> `keyboard` (mouse+keyboard as one scheme); gamepad -> `gamepad` only when, during the per-frame poll, a button goes from released to pressed or a stick axis exceeds a deadzone (~0.3-0.5). Without the deadzone, stick drift flips glyphs back to the pad while the player is typing. Emit a change event only when the kind changes, and debounce rendering (prompts listen to the event; nobody polls).
- Bind keys by `code` (layout-independent position), display with `getLayoutMap()` when available, else a static US-label table / `event.key` captured at runtime. Load the layout map once (async) and re-render prompts when it resolves.
- Brand glyphs: since `mapping === 'standard'` normalizes positions, store pad bindings as positions (Boogle's `PAD` names already follow the standard index order; KAPLAY uses `south`), then pick a label set (Xbox letters / PlayStation shapes / Nintendo letters) from a vendor-id hint. Nintendo pads swap face letters relative to position, so positional ids avoid baking letters into data.
- KAPLAY's `pressButton`/`releaseButton` is the cleanest web precedent for touch buttons: the touch UI is just another source that injects the same action, so touch buttons can be generated from registry entries that opt into touch.

### Gaps
- Backbone One's `Gamepad.id` string and mapping on iOS/Android browsers: no published value found; needs testing on-device (`console.log(navigator.getGamepads())`).
- Current browser support table for `getLayoutMap` (Chromium-only is commonly stated but the MDN page fetch did not include the table).
- KAPLAY last-input-device API: not found in the guide or search; do not assume it exists.
- Phaser, Excalibur, kontra, PlayCanvas, Babylon GUI action-registry features: not researched within budget.

## 3. Context-sensitive action sets and filtering the guide by context

### Takeaway
Engines model context as named sets of actions that are switched or stacked: Unity action maps, Unreal mapping contexts with priority, Steam action sets plus layers. A guide or prompt bar shows only actions in the active set(s). For Boogle, a `context` tag on each action plus a small "active contexts" set is enough.

### Cited Findings
- Unity: one active action map per `PlayerInput`, switched with `SwitchCurrentActionMap("name")`. — [Unity manual, PlayerInput](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/PlayerInput.html)
- Unreal: mapping contexts are "a certain context that the player can be in", added/removed at runtime with priority; the highest-priority context wins when two map the same action. — [Unreal docs, Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine)
- Steam: action sets ("Menu", "Walk", "Drive") plus stackable layers; activating a set every frame from a state loop is explicitly fine; origins (and so glyphs) are queried per action set. — [Steamworks ISteamInput](https://partner.steamgames.com/doc/api/ISteamInput)
- Boogle already has a modal concept: `setPadModal(fn)` hands every pad press to a talk box instead of actions. — `src/player/controls.js` (local code)

### Inferences
- Suggested shape: `context: 'play' | 'swim' | 'build' | 'menu' | ...` (or an array) on each action, `setContexts(['play', 'swim'])` driven by game state, an implicit `always` context (pause, help). The guide groups visible actions by `category`, and the bottom-of-screen prompt bar shows only the actions valid right now. Steam's "set + layers" is a good mental model: base set (on foot / menu) plus layers (swimming, holding an item).
- Slot collisions should be checked per context: two actions may share a pad slot if their contexts never overlap (Unreal resolves this with priority; a small game can instead forbid overlap at registration and allow it across disjoint contexts).
- Boogle's `setPadModal` is effectively a "menu" context that bypasses the registry; folding it into contexts would let the talk box show its own prompts from the same data.

### Gaps
- No source found describing how shipped games' controls-guide screens filter by context (e.g. "show all" vs "show current"); this is a UX choice.

## 4. Plugin-friendly registration, generated guides, and tests/lint for missing labels or slot collisions

### Takeaway
The engines' metadata fields (Unreal `Name`/`DisplayName`/`DisplayCategory`/`Metadata`, Steam's localized origin strings, Godot's queryable `get_actions()`/`action_get_events()`) show what a feature should declare so the guide can be generated: stable id, localizable label, category, bindings per device, context. Boogle's existing slot-collision warning is a runtime check; the same rules can run in a unit test over the registry.

### Cited Findings
- Unreal mappable key metadata: unique `Name` used to save the mapping, localized `DisplayName`, `DisplayCategory` for grouping, `Metadata` for icons etc. — [Unreal API, UPlayerMappableKeySettings](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/EnhancedInput/UPlayerMappableKeySettings)
- Godot exposes the registry for enumeration: `get_actions()`, `has_action()`, `action_get_events()`. — [Godot docs, InputMap](https://docs.godotengine.org/en/stable/classes/class_inputmap.html)
- KAPLAY's `getButton(name)` returns the binding object per device, so UI can be generated from it. — [KAPLAY input guide](https://kaplayjs.com/docs/guides/input/)
- Boogle today: `registerAction` refuses an unknown slot or a taken slot with a `console.warn` naming free slots; `gamepad.js` generates its help card from `listActions()`. Actions are registered from `src/player/input.js`, `honk.js`, `ping.js`, `updates.js`, `gamepad.js`. — local code (`src/player/controls.js`, `src/features/gamepad.js`)

### Inferences
- Rebind-ready data shape (bindings stored as data keyed by device kind, never closed over by UI), extending today's call rather than replacing it:
  ```js
  registerAction('dig', {
    label: 'Dig',            // short verb for prompts; i18n key later
    hint: 'hold',            // optional: hold / tap / toggle, rendered by the guide
    category: 'Terrain',     // guide grouping (cf. Unreal DisplayCategory)
    context: 'play',         // which action set it lives in
    keys: ['KeyF'],          // KeyboardEvent.code values
    pad: 'rt',               // standard-mapping position (current field, unchanged)
    touch: { icon: 'shovel' } | null, // generate an on-screen button, or none
    order: 30,               // stable sort within category
    down, up, held,
  });
  ```
  Rebinding later = replacing `keys`/`pad` from a saved override map keyed by action id (Unreal saves by `Name`; KAPLAY `setButton` merges per device). UI must always read `getBindings(id)` at render time, never cache a label string.
- Prompts as a function, not a string: `promptFor(id)` returns `{ glyph, text }` for the current device kind and brand; features call it whenever they render (and re-render on the device-change event). This removes the stale `Reload (RB)` pattern in `updates.js`.
- Cheap guards suitable for `node:test` (pure logic, no DOM), matching the repo's test rules: import every module that registers actions (or a registry snapshot), then assert (a) every action has a non-empty `label` and `category`, (b) no two actions share a pad slot or key within overlapping contexts, (c) every action has at least one binding usable on gamepad (the AGENTS.md rule that every control is pad-playable), (d) labels fit a max length for prompt bars. The risk is that importing features pulls in three.js/DOM; a split where each feature exports a plain `ACTIONS` data array (registered by the feature at start) would let the test read data without side effects.
- Generated guide: group by `category`, sort by `order` then label, filter by active contexts, render glyph per current device. The same list drives the pause-menu controls page and the gamepad help card, so they cannot drift.

### Gaps
- No open-source web game found that lints its action registry; the test ideas above are not drawn from a cited project.
- No source on i18n patterns for prompt labels specifically (Unreal's FText `DisplayName` and Steam's localized `GetStringForActionOrigin` show the direction but not a JS pattern).

## 5. Pitfalls: stale labels, glyph mismatch per brand, mobile layout, i18n readiness

### Takeaway
The recurring failures are prompts that do not refresh when the device or binding changes, glyphs chosen from a hardcoded assumption rather than the real binding or device, and unreliable brand detection. Design for a text fallback and a neutral glyph set first.

### Cited Findings
- Hardcoded translation from Xbox buttons ignores user remapping and shows wrong prompts; fall back to platform glyphs when the game lacks art for an origin; new origins appear as hardware ships. — [Steamworks ISteamInput](https://partner.steamgames.com/doc/api/ISteamInput)
- Prompt widgets that do not refresh until the input method changes, and keyboard icons missing in some containers, are reported against Unreal CommonUI; some developers replaced the stock widget with their own subscriber. — [Unreal forum thread](https://forums.unrealengine.com/t/common-action-widget-doesnt-work-until-switching-input-methods/1812980); [Unreal forum, Lyra icons](https://forums.unrealengine.com/t/lyra-commonui-how-to-enable-display-mouse-and-keyboard-input-icons-inputactionwidget/1277757)
- Device-switch notification bugs in Unity (`onControlsChanged` not firing after re-enable; auto-switch locking onto one device). — [Unity issue 1](https://issuetracker.unity3d.com/issues/playerinput-dot-oncontrolschanged-event-will-no-longer-trigger-when-playerinput-gets-disabled-and-re-enabled); [Unity issue 2](https://issuetracker.unity3d.com/issues/input-system-auto-switch-locks-on-one-device-when-its-disabled-and-re-enabled-via-script)
- Brand detection from `Gamepad.id` differs between Chrome and Firefox and is unreliable for PlayStation pads; PlayStation face-button indices differ across models and platforms at the raw level. — [silbinarywolf devlog](https://silbinarywolf.itch.io/give-up-the-dupe/devlog/257921/you-cant-just-query-if-a-controller-is-for-xbox-or-playstation)
- Community icon packs used by engine addons: Kenney (public domain) in Godot Input Prompts; Xelu's CC0 prompts in a paid Godot mapper. The Godot remap addon's author notes its Switch and PlayStation icons are untested. — [godot-input-prompts](https://github.com/Pennycook/godot-input-prompts); [Godot Input Mapper (Gumroad)](https://bfeber.gumroad.com/l/czqqa); [bend-n/remap](https://github.com/bend-n/remap)
- Keyboard layout: QWERTY labels are wrong on AZERTY etc.; `getLayoutMap` addresses it but is not Baseline and requires a secure context. — [MDN, getLayoutMap](https://developer.mozilla.org/en-US/docs/Web/API/Keyboard/getLayoutMap)
- `pointerType` may be `""` when the browser cannot tell. — [MDN, pointerType](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType)

### Inferences
- Stale labels: any label baked into DOM at registration time goes stale on device switch, rebinding, or slot reassignment (Boogle's `updates.js` already does this). Rule: features never format binding text themselves.
- Glyph-flicker: without a deadzone and edge-detection on gamepad input, idle stick drift or a resting trigger can flip prompts to the pad; with touch, synthesized mouse events after a tap can flip prompts to keyboard, so prefer Pointer Events and trust `pointerType`.
- Brand: default to a neutral position-based or Xbox-letter set (the standard mapping is Xbox-shaped), switch to PlayStation shapes only on a confident vendor match (`054c`), and keep a user override in settings later. For the Backbone (the project's target pad), test what `id` it reports before writing any brand logic.
- Mobile: touch buttons generated from the registry need a cap and a layout (thumb zones), and actions without `touch` should still be reachable (e.g. via a context menu); generating one button per action does not scale past a handful.
- i18n readiness: keep `label` as a short key-like string now, avoid concatenating glyph + verb into one sentence (word order differs by language), and keep glyph rendering separate from the text so a later `t(label)` swap touches one function.

### Gaps
- No source found on screen-reader / accessibility handling of glyph-only prompts.
- No primary data on how often web players use non-QWERTY layouts or non-Xbox pads.
