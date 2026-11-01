# Cross-device input: one game on touch, keyboard and trackpad, and gamepad

*Research report, 1 November 2026. How one game serves touch, keyboard with trackpad or mouse, and gamepads, with the M4 iPad Pro and its Magic Keyboard as the lowest target ([boogle-2.md](../proposals/boogle-2.md), Process). It covers iPadOS Safari (pointer lock, trackpad events, Pointer Events, keyboard quirks, the Gamepad API), touch controls in shipped games (Genshin Impact, Fortnite, Sky, Brawl Stars, Roblox, Minecraft Bedrock), virtual sticks, touch camera and gyro, switching input modes mid-session, glyphs, vehicles on touch, and accessibility. It builds on [controls-guide-and-pause-menu.md](controls-guide-and-pause-menu.md) (the registry, the pause view, last-used-device detection, glyph sets, Kenney prompts, the PlayStation trademark question) and [vehicle-feel.md](vehicle-feel.md) §6 (touch steering, Telfer's "less control is more"); those findings are not repeated. The code was read at 2acec33. The input-mode switch (key or trackpad → keyboard mode, touch → touch mode) was not on `main` yet, so this report describes the code as it is and leaves the switch to its author. Nothing was run on an iPad. Recommendations only: nothing here is a design decision.*

*Update, 1 November 2026 (gap fill, from WebKit source and bugs; nothing run on an iPad yet):*

- **Settled: `cursor: none` does not hide the iPadOS pointer** [V]. WebKit's iOS pointer code only knows the hand and I-beam cursors; anything else gets the system pointer.
- **Mostly settled: a Magic Keyboard trackpad pinch reaches no DOM event.** The source points to neither `gesturechange` nor ctrl-`wheel`: the pinch goes to UIKit's scroll-view zoom (derived from the source, not yet seen on a device).
- **Still open: WebKit 311151 and Home Screen web apps.** The bug is unchanged (NEW, no patch, last touched 15 October 2026) and still says nothing about them. The source didn't settle it, so the device test in item 5 remains the only answer.

The pinch and cursor findings are marked **[V]** (the WebKit source or bug page was read and says this) or **[S]** (a secondary report); *derived* means worked out from the source.

**Markers.** *Verified*: fetched and read at the source (a WebKit bug, a spec, a vendor's own docs). *Secondary*: a wiki, guide, forum or third-party write-up. *Derived*: worked out for Boogle from the sources and the code; nobody stated it.

## Summary

1. **iPadOS Safari has no Pointer Lock, through Safari 27.2.** On the iPad, mouse look has to come from a click-drag or a two-finger trackpad scroll, never from a locked cursor.
2. **An iPad with a Magic Keyboard matches `(pointer: coarse)`**, the media query `isTouch` reads at load. Today it therefore gets the touch UI, and a trackpad click on the left of the screen starts the virtual stick. Mode has to come from events (`pointerType`, `keydown`), not media queries.
3. **Two-finger trackpad scrolls arrive as `wheel` events on iPadOS since 14.5.** Boogle currently swallows them. They are the natural camera orbit when there is no lock.
4. **Fullscreen on iPad drops the shoulder buttons.** WebKit bug 311151 (open, Safari 26.5) loses buttons 4–7 (LB, RB, LT, RT) in fullscreen. Boogle uses all four, and the pause view offers Fullscreen.
5. **Safari's `Gamepad.id` is the product name plus "Extended Gamepad"**, with no vendor ID. Brand glyphs can only key off names like "DualSense". A gamepad press still does not count as a user gesture.
6. **Shipped touch games agree on a floating stick on the left and direct drag-to-look on the right.** Apple's HIG says the same. Boogle already does both, but its stick has no dead zone and its buttons are small for a 13-inch tablet.
7. **Switching modes needs edges and hysteresis.** Roblox's `PreferredInput` (2025) picks touch only when nothing else is in use. Unreal's CommonUI has a "thrashing window" for exactly the flicker problem.
8. **Gyro aim is a web permission prompt and a poor fit for a heavy tablet with a keyboard attached.** If it ever comes, it should be opt-in and treated "like a mouse" (Jibb Smart).
9. **Vehicles on touch want their own layout.** Fortnite swaps whole touch layouts per context and added throttle, brake and horn actions in 2026. Asphalt and Mario Kart Tour offer auto-accelerate and steering assists.
10. **Accessibility asks for toggles instead of holds, sensitivity of at least ±50%, remapping by action, no required multi-finger gestures, and 24 mm touch targets on tablets** (XAG 107). The registry already keys by action, so most of this is settings, not plumbing.

## 1. iPadOS Safari: pointer, trackpad and keyboard

### Pointer Lock does not exist on iOS or iPadOS (verified, secondary)

- [caniuse: Pointer Lock](https://caniuse.com/pointerlock) (verified) lists Safari on iOS as unsupported in every version through 27.2. Desktop Safari has had it since 10.1. The [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/pointer-lock) agrees. Neither of the Safari 27 posts I read lists it ([27.1](https://webkit.org/blog/18486/webkit-features-for-safari-27-1/), [27.2](https://webkit.org/blog/18515/webkit-features-for-safari-27-2/)); the 27.0 post covers pointer and wheel fixes but not lock ([27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/)).
- [Flint PR #153](https://github.com/chrischaps/Flint/pull/153) (secondary, a game's own fix): on iPad the methods are simply missing. An unguarded `document.exitPointerLock()` threw a TypeError and froze the game loop on the first touch. Desktop and Android testing never caught it. Boogle guards both calls: `requestLock` checks `canvas.requestPointerLock`, and `modal.ts` checks `pointerLockElement` first.
- Apple's native `UIPointerLockState` / `prefersPointerLocked` ([Apple docs](https://developer.apple.com/documentation/uikit/uipointerlockstate/islocked.md)) is for apps, and even there "the system may not honor" it. It says nothing about Safari.

### A trackpad iPad looks like a touch device to media queries (secondary)

- [t3code issue #14868](https://github.com/pingdotgg/t3code/issues/14868) (secondary, logged on Safari 26.6.1 with a Magic Keyboard trackpad) recorded `(hover: hover)` false, `(pointer: fine)` false, `(pointer: coarse)` true, `(any-hover: hover)` true and `(any-pointer: fine)` true. `pointerType` was `"mouse"` for the trackpad. The user agent claimed to be a Mac.
- For Boogle (derived): `isTouch = matchMedia('(pointer: coarse)').matches` in [src/constants.ts](../../src/constants.ts) is true on that iPad, so `body.touch` is set and the touch overlay covers the canvas. The overlay's `pointerdown` in [src/player/input.ts](../../src/player/input.ts) does not look at `pointerType`. A trackpad click on the left 45% of the screen therefore spawns the virtual stick, and a click on the right starts touch-look. `any-pointer: fine` is the media query that notices the trackpad, but it is static too: it says a trackpad exists, not that the player is using it.

### Wheel, pinch and Pointer Events from the trackpad (verified)

- [WebKit bug 210071](https://bugs.webkit.org/show_bug.cgi?id=210071) (verified, fixed): in iPadOS 13.4, trackpad and mouse scrolling on iPad fired only `pointermove`. Real `wheel` events shipped in iPadOS 14.5 (Tim Horton, April 2021). Follow-ups 226080 (wheel sometimes missing) and 226082 (`pointermove` instead of `mousemove` after a press) were filed. Boogle's canvas `wheel` handler calls `preventDefault` and does nothing else.
- **A trackpad pinch most likely reaches the page as no DOM event** (derived from [V] source; unconfirmed on a device). The evidence:
  - **Mac only.** WebKit's trackpad gesture path (`NativeWebGestureEvent`, from `NSEvent` magnify and rotate) is compiled only under `ENABLE(MAC_GESTURE_EVENTS)`.
  - **No touches, so no `gesturechange`.** On iOS, `gesturestart`/`gesturechange` come from WebCore's touch handling (`IOS_GESTURE_EVENTS`), built from two direct touches. An indirect trackpad pinch produces no `UITouch` for the content view, so there is no touch event and no gesture event.
  - **UIKit takes the pinch.** It goes to UIKit's `UIScrollView` pinch recognizer, which WKWebView treats as user-triggered page zoom. `scrollViewWillBeginZooming` in `WKWebViewIOS.mm` calls `cancelPointersForGestureRecognizer:` on it, so a drag-look in progress gets a `pointercancel`.
  - **No ctrl-`wheel`.** No iOS code path synthesizes one.

  So the page can't read the pinch, and Boogle's `gesturestart` `preventDefault` can't stop it. The likely visible result is the whole page zooming, as on a phone before that block was added. `touch-action: none` won't help either, since WebKit's touch-action recognizers see only touches.
- [Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/) (verified) fixed `preventDefault()` on `pointerdown` so that it now suppresses `mousedown` and `mouseup` on iOS (174864309). Boogle reads the trackpad's click through `mousedown` on the canvas. Any future `pointerdown` handler that cancels will now also silence that path on iOS 27.
- Apple Pencil (secondary): the spec's values are `"pen"` for a stylus, `"mouse"` and `"touch"` ([Pointer Events 3](https://www.w3.org/TR/pointerevents3/)). A Flutter report says Pencil *hover* on iPadOS 26 arrives as the mouse kind, so it cannot be told from a trackpad ([flutter #195249](https://github.com/flutter/flutter/issues/195249)). That report is native, not Safari, and is unconfirmed on the web.
- **`cursor: none` does not hide the iPadOS pointer** [V]. WebKit's `pointerInteraction:styleForRegion:` (in `WKContentViewInteraction.mm`, the same in the Safari 27 branch `safari-7625.2.8` and on trunk) maps only two CSS cursors:
  - `pointer` (hand) gets the system pointer, with a region around the element;
  - `text` (I-beam) gets a beam;
  - every other value, `none` included, falls through to `[UIPointerStyle systemPointerStyle]`, the grey dot. WebKit never returns UIKit's hidden pointer style.

  iPadOS can hide the pointer on its own after a few seconds without trackpad movement (Settings → Accessibility → Pointer Control → Automatically Hide Pointer; [Apple](https://support.apple.com/guide/ipad/ipad66ce6358/ipados)) [S]. Boogle can't control that. While the camera turns from a two-finger scroll the pointer stays where it was, since a scroll doesn't move it.

### The hardware keyboard (secondary)

- The Magic Keyboard for the M4 iPad Pro added a 14-key function row with a dedicated Escape key and a larger haptic trackpad ([9to5Mac](https://9to5mac.com/2024/05/07/apple-debuts-pro-magic-keyboard/), [MacRumors](https://www.macrumors.com/2024/05/09/ipad-pro-magic-keyboard/)). Earlier iPad Magic Keyboards had no Esc. Boogle's pause also opens on H, which covers them.
- On iPadOS 26, holding a letter that has accented alternates may not auto-repeat, because the system waits for an accent choice. Keys without alternates repeat ([Obsidian forum](https://forum.obsidian.md/t/ipad-vim-mode-keyboard-repeat-issue/106836), secondary, reproduced in Safari). Boogle ignores repeats and tracks held keys by `keydown`/`keyup`, so this should not matter. Whether holding A or S ever pops the accent picker over a canvas is untested.
- An old WebKit bug ([149054](https://bugs.webkit.org/show_bug.cgi?id=149054), verified) had no key events at all on iOS when nothing was focused. Apple believed it fixed in iOS 13, but the thread only confirms the fix for focused editors. Boogle focuses the canvas on a mouse press and when a pad claims focus.
- A WebKit changeset ([240742](https://trac.webkit.org/changeset/240742/webkit), secondary summary) notes that UIKit gives system text commands and app shortcuts first claim on a key before WebKit sees it. Cmd-combos and Globe shortcuts belong to the system, not the page.

## 2. The Gamepad API on iPad

- **Shoulders vanish in fullscreen.** [WebKit bug 311151](https://bugs.webkit.org/show_bug.cgi?id=311151) (verified): on iPadOS with the standard mapping, buttons 4–7 (L1, R1, L2, R2) stop reporting once the page is in Fullscreen. It was reported March 2026, confirmed again on Safari 26.5 in May, and is still NEW and assigned (last touched October 2026). There is no workaround. In Boogle those are the hotbar's LB/RB, bump on RT and guest crouch on LT, and the pause view has a Fullscreen button ([src/features/pause.ts](../../src/features/pause.ts)). Re-checked 1 November 2026 [V]:

- **The bug.** It is filed against WebKit/UI Events (Safari 26, iOS 26) and is still NEW. Its last comment is from 20 May 2026, and it was last touched on 15 October 2026. It depends on the iOS Fullscreen API meta-bug (206854).
- **No fix.** No WebKit commit references it, and neither the Safari 27.0 nor the WWDC26 post lists a gamepad fix for iPadOS. The only gamepad fix in Safari 27 is a visionOS one.
- **Home Screen web apps.** Nothing in the bug mentions them, standalone mode or `display-mode`. WebKit's iOS gamepad code (`GameControllerGamepadProvider`) has nothing fullscreen-specific I could find, so the cause can't be read from the source.
- **Derived guess.** A Home Screen web app never enters element fullscreen, so it probably avoids whatever the fullscreen view controller does to buttons 4–7. That is a guess until the item 5 test is run.

The bug says nothing about Home Screen web apps, which since Safari 26 open standalone for every site without a manifest ([WebKit, Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/), verified).
- **No user gesture from a pad.** [WebKit bug 217675](https://bugs.webkit.org/show_bug.cgi?id=217675) (verified, NEW since 2020, accepted in principle) asks for pad presses to count as user activation, and 235052 asks the same for stick motion. Until they land, fullscreen, audio unlock and permission prompts need a tap, click or key. `pause.ts` already says so in its fallback label.
- **Layout fixes.** [WebKit bug 314649](https://bugs.webkit.org/show_bug.cgi?id=314649) (verified, fixed May 2026 in WebKit main): extended controllers without a Home button had been given the wrong layout. Which Safari release carries the fix is not stated. [Bug 266293](https://bugs.webkit.org/show_bug.cgi?id=266293) (verified, open, PR in May 2026): the DualSense touchpad click (button 17 in Chrome) is unmapped in WebKit. Bug 288840 says the same of the Xbox Series Share button. Neither is in Boogle's `PAD` list, so this is no loss.
- **What `id` says.** Safari's `Gamepad.id` is only the product name, which the OS may rewrite, plus "Extended Gamepad" when the pad is a `GCExtendedGamepad`. Example: "DUALSHOCK4 Wireless Controller Extended Gamepad" (Matt Reynolds on [w3c/gamepad #199](https://lists.w3.org/Archives/Public/public-webapps-github/2024Apr/0277.html), verified). Chrome appends vendor and product IDs and Firefox prefixes them, so a cross-browser brand check is a name match first and a vendor-ID match second ([itch.io devlog](https://itch.io/devlog/257921/you-cant-just-query-if-a-controller-is-for-xbox-or-playstation.amp), secondary, which also falls back to generic labels).
- **Rumble** is "limited availability" and varies by platform even when the pad has motors ([MDN vibrationActuator](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/vibrationActuator), verified). The support table was not readable. Feature-detect and catch.
- **Testing is coming.** A WPT interop proposal for a virtual gamepad driven by WebDriver ([interop #1454](https://github.com/web-platform-tests/interop/issues/1454), verified, September 2026) targets 2027. Until then pad behavior on iPad is checked by hand.
- Older reports of iPad pads not always being detected ([FB8887166](https://openradar.appspot.com/FB8887166), 2020, WKWebView) and visionOS's `gamepadconnected` waiting for a permission (fixed in Safari 27.0, 141623162) are context. As everywhere, a pad stays invisible to the page until a button is pressed ([MDN, Using the Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)).

## 3. Touch controls in shipped games

### Apple's guidance (verified)

[Apple HIG, Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls) (read through its JSON):
- Prefer gestures in the world (tap the thing) to virtual buttons.
- Movement goes on the left, camera on the right, and both use as much area as they can.
- Show the movement stick where the thumb lands. Pan the camera by direct touch, not with a second stick.
- Minimum sizes are 44×44 pt for frequent controls and 28×28 pt for menus.
- Every press shows a state that stays visible under the finger, with sound and haptics.
- Artwork shows the action, never "A", "X" or "R1".
- Hide controls when their action is unavailable, and let the stick fade at rest.
- Fold variants into double-tap or touch-and-hold, and combine walk and sprint in one control.
- Put secondary controls such as menus at the top.

The WWDC26 session "Make your game great with touch" and the Touch Controller framework add nine anchor points for layouts across screen sizes ([WWDC26 358](https://developer.apple.com/videos/play/wwdc2026/358/), only the summary was readable).

### What the games do (secondary unless marked)

- **Sky: Children of the Light** ([Apple, Behind the Design](https://developer.apple.com/news/?id=zm47it7t), verified; [Sky help](https://thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/faq/489-how-do-i-get-my-character-to-move/), verified). After years of experiments, including a full flight simulator, the team shipped one-handed play first, because casual players "would never put two hands on the screen". A two-handed mode followed after launch. Two-handed: a d-pad on the left (swappable to the right), where sliding inside the circle walks and pushing past it runs, and a flick jumps. One-handed: movement anywhere on the screen and the camera on a two-finger drag. Chen: "a nudge, rather than a leash."
- **Genshin Impact** ([Genshin wiki, Settings](https://genshin-impact.fandom.com/wiki/Settings), [Controls](https://genshin-impact.fandom.com/wiki/Controls)): a joystick on the left, drag on empty screen to turn the camera, and a pinch to zoom. Camera sensitivity was later split into horizontal and vertical. Gyro is available for aimed shots only. An old guide says the layout cannot be moved.
- **Fortnite mobile** ([Epic help](https://www.epicgames.com/help/c-202300000001636/c-202300000001721/how-do-i-customize-my-hud-in-fortnite-on-mobile-a202300000016543), [HUD Layout Tool wiki](https://fortnite.fandom.com/wiki/HUD_Layout_Tool), [Sportskeeda](https://sportskeeda.com/esports/getting-started-fortnite-for-mobile)): a HUD layout tool moves every button except the stick, with presets ("Combat Pro", "Builder Pro"). Fire is a choice of auto-fire, tap anywhere or a dedicated button. Double-tapping the stick auto-runs and a tap stops it. For creators, [customizable touch controls](https://dev.epicgames.com/documentation/fortnite/developer-customizable-touchscreen-controls-in-fortnite?lang=en-US) (verified) swap a whole touch layout per context, such as walking, driving or a shop, by enabling a different HUD device. v41.30 (August 2026) added vehicle actions (throttle, brake or coast, boost, horn, switch seat) and an experimental `PointerZoom` that reads a pinch, a mouse wheel and the right stick as one action ([The Click](https://www.theclick.gg/fortnite-mobile-creator-tools/)).
- **Brawl Stars** ([Brawl Stars wiki, Beginner's Guide](https://brawlstars.fandom.com/wiki/Beginner's_Guide)): the attack stick is dual-use. A tap fires at the nearest target; a drag aims and fires on release, and dragging back to the center cancels. The movement stick can be fixed or floating. A tip site points out the cost: a tap that slides a few millimeters becomes a badly aimed manual shot ([Keymap](https://keymap.io/games/brawl-stars/)).
- **Roblox** ([DevTouchMovementMode](https://create.roblox.com/docs/en-us/reference/engine/enums/DevTouchMovementMode.md), verified): a dynamic thumbstick appears where the lower screen is touched, the classic one is fixed, and the player's choice is the default. Jump is its own button. Roblox's control script sizes the jump button by the screen's short side, 70 at or below 500 and 120 above ([DevForum](https://devforum.roblox.com/t/jump-button-and-thumbstick-sized-positioned-wrong-in-mobile-emulator/2861222)).
- **Minecraft Bedrock** ([1.19.50 notes](https://feedback.minecraft.net/hc/en-us/articles/10833168748557-Minecraft-1-19-50-Bedrock), verified; [Controls wiki](https://minecraft.wiki/w/Controls)): touch offers three schemes, "Joystick & tap to interact", "Joystick & aim crosshair" (console-style, acting at the center) and the classic D-pad. Auto-jump is an option, and XAG cites it as a good "auto hold" ([XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)).
- **Call of Duty: Mobile** (via XAG 107, verified): per-camera sensitivity sliders, a "simple" fire mode that shoots when on target, "always sprint", and ADS as a choice of hold, tap, hybrid or double tap.

### Virtual sticks (verified, secondary)

- **Dead zones.** Josh Sutphin, [Doing Thumbstick Dead Zones Right](https://www.gamedeveloper.com/business/doing-thumbstick-dead-zones-right) (verified), compares the three shapes. Axial snaps to the cardinal directions. Radial jumps from zero to the threshold. Scaled radial (`dir × (|v| − dz) / (1 − dz)`) ramps smoothly and is his pick, at a typical 0.1–0.2. He also mentions a "bowtie" variant that widens one axis's dead zone as the other grows.
- **Floating or fixed** (secondary: [Unity guide](https://scriptsforunity.com/blog/touch-input-best-practices-unity/), [a playtest issue](https://github.com/jbogaardt/me_rpg/issues/16)). A fixed stick is predictable for constant use, but thumbs drift off it in fast play. A floating one makes the first touch its center. Apple's HIG picks floating for movement.
- **Size.** [XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107) (verified) suggests minimum default touch targets of 15 mm on phones and **24 mm on tablets**, with dead space around each. Apple's 44 pt is a floor, not a target.
- For Boogle (derived): the M4 iPad Pro draws at 264 ppi with 2 device pixels per CSS px, so 1 CSS px is about 0.19 mm. The 76 px Jump and Grab buttons ([src/style.css](../../src/style.css)) are about 14.6 mm, above Apple's 44 pt but under XAG's 24 mm (about 125 px). The stick's visible ring is 124 px (24 mm), but its travel is a 50 px radius (9.6 mm) and the output is linear with no dead zone ([src/player/input.ts](../../src/player/input.ts)).

### Camera on touch, and gyro (verified, secondary)

- **Direct drag** is the norm (Apple HIG, Genshin, Sky's two-finger drag in one-handed mode). Touch needs its own rate, not the mouse's: one fix found touch drag sharing the mouse's radians-per-pixel, so short swipes barely turned ([flight3d PR #206](https://github.com/stlim0727/flight3d/pull/206), secondary). Shooters split X and Y and add acceleration (Genshin, The Division Resurgence). Boogle already uses 0.006 rad/px for touch yaw against 0.0024 for a locked mouse.
- **Gyro.** Jibb Smart's [Good gyro controls, part 1](http://gyrowiki.jibbsmart.com/blog:good-gyro-controls-part-1:the-gyro-is-a-mouse) (verified):
  - Treat the gyro "as a mouse": angular velocity maps linearly to camera turn, with sensitivity in real-world units (1 = a real turn matches the game's).
  - Smooth only small motions, and shrink tiny inputs with "tightening" instead of a hard minimum.
  - Let players pause the gyro by holding a button, and combine it with the stick rather than replacing it.
  - Keep latency low.
- **Gyro on the web** needs `DeviceOrientationEvent.requestPermission()` (or `DeviceMotionEvent`'s) from a user gesture on HTTPS. A denial sticks until the site data is cleared, and the spec marks the permission integration "at risk" ([W3C](https://www.w3.org/TR/orientation-event/), verified; [Defold forum](https://forum.defold.com/t/orientation-and-motion-sensors-on-ios-web-browser-safari-solved/77392), secondary). Mario Kart Tour's gyro steering was reported as very low sensitivity ([Pocket Gamer](https://www.pocketgamer.com/mario-kart-tour/mario-kart-tour-cheats-tips-custom-control-setting)). XAG 107 lists gyro among the inputs that need an alternative.

## 4. Switching input modes mid-session

- **Roblox `PreferredInput`** (added May 2025; [UserInputService](https://create.roblox.com/docs/reference/engine/classes/UserInputService), verified; [enum reference](https://robloxapi.github.io/ref/enum/PreferredInput.html)). The values are KeyboardAndMouse when connected or last used, Gamepad when connected or last used, and Touch only when the device is touch-enabled and no other input is available or recently used. UI listens for its change signal. A separate `LastInputType` reports the raw last device. The design point is that "preferred" is not "last event".
- **Unreal CommonUI** ([CommonInputSubsystem](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/CommonInputSubsystem?application_version=5.7), verified) fires `OnInputMethodChanged`. It keeps a "thrashing window" (`GetInputMethodThrashingWindowInSeconds`) to detect a method flipping back and forth, and a CVar dumps the call stack on each switch. The [forum report](https://forums.unrealengine.com/t/commoninput-detection-constantly-switching-between-both-mouseandkeyboard-and-gamepad/1391525) it answers: a stick move registered as both mouse and pad, and the two fought.
- **Apple's controller pattern**: show on-screen controls only while no controller is connected, and hide them when one connects ([GCVirtualController](https://developer.apple.com/documentation/gamecontroller/adding-virtual-controls-to-games-that-support-game-controllers-in-ios); only the title was readable, the rest is from memory). Boogle hides the overlay on pad *use* rather than connection, which suits a pad that sleeps on the couch.
- Prior research already set the edges for a pad: a button edge or a stick past about 0.3–0.5 ([controls-guide-and-pause-menu.md](controls-guide-and-pause-menu.md), Phase 3). The iPad adds two more (derived): a trackpad is `pointerType "mouse"` but hovers continuously, and the Pencil may hover as `"mouse"` too. "The pointer moved" is therefore a weak signal on iPad. A click, a scroll or a key is a strong one.

## 5. Glyphs

- Apple: show the connected controller's own labels, prefer SF Symbols (they include many third-party brands), and in UI use A to confirm, B to go back and Menu to pause ([HIG](https://developer.apple.com/design/human-interface-guidelines/game-controls), verified). SF Symbols are native-only. On the web the equivalent is drawn glyphs chosen by a brand guess from `Gamepad.id` (section 2).
- On touch, label buttons with the action, never a controller letter (HIG). Boogle already does this; `glyph()` returns '' on touch.
- After a remap, every hint, tip and diagram must show the new binding ([XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)). Boogle's glyphs already read slots from the registry.

## 6. Vehicles on touch

[vehicle-feel.md](vehicle-feel.md) §6 and recommendation 8 already cover the soapbox's steering dead zone, gravity as throttle and a touch-only wall assist. New here:
- Fortnite swaps to a driving layout with throttle, brake or coast, boost and horn, instead of overloading the walking buttons ([Epic](https://dev.epicgames.com/documentation/fortnite/developer-customizable-touchscreen-controls-in-fortnite?lang=en-US), verified).
- Asphalt 9 offers three steering modes (touch-drive, tap to steer, tilt), all with optional auto-accelerate so nobody has to hold a pedal ([XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107), verified). Need for Speed: Most Wanted gives steering the whole left half and spaces brake and nitro apart on the right (same source).
- Mario Kart Tour's first-launch choice is between swipe-to-steer and manual drift, with "Smart Steering" as an assist that also blocks some shortcuts ([Pocket Gamer](https://www.pocketgamer.com/mario-kart-tour/mario-kart-tour-cheats-tips-custom-control-setting), secondary).
- For Boogle (derived): the soapbox reads steering from `input.stickX` and throttle from `-input.stickY` on the same touch stick ([src/proto/soapbox/index.ts](../../src/proto/soapbox/index.ts)). With a linear stick and no dead zone, a thumb that drifts down while steering hard also brakes.

## 7. Accessibility

[XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107) (verified, updated June 2026) and the [Game Accessibility Guidelines on holds](https://gameaccessibilityguidelines.com/avoid-provide-alternatives-to-requiring-buttons-to-be-held-down/) (verified) set these expectations:
- **Remapping.** Remap *actions*, not just swap buttons. Include the Esc key and per-stick invert X and Y. Keep every hint correct after a remap.
- **Holds.** Offer hold, toggle or automatic for holds that aren't essential, such as sprint and aim. Stick clicks (L3/R3) are hard presses and good candidates for alternatives. Avoid presses longer than 2–3 seconds, mashing and chords.
- **Sensitivity.** A per-input sensitivity setting that reaches at least ±50% of the default.
- **Gestures.** Nothing may require a multi-finger or path gesture without a single-tap alternative.
- **Activation.** Activate UI on the up event, so a press can be cancelled by sliding off.
- **Touch layout.** Touch targets of 24 mm on tablets, with dead space around them. Movable and resizable targets, preset layouts, simplified schemes (auto-pickup, auto-fire), portrait as well as landscape, and support for Switch Control and Voice Control.
- **Keyboard.** A game that supports the keyboard can be started, set up, played and left with the keyboard alone.

Boogle today (derived): sprint is a held Shift on the keyboard but a latch on the pad. Touch has no sprint. Mouse look is the only look on a keyboard with no lock (no arrow-key look). Pinch is blocked, so no gesture is required.

## 8. Interact, talk and back on a controller (2026-11-01)

Asked after the owner's iPad + controller playtest (2026-11-02 in [playtests.md](../playtests.md)): Interact was on B
and "B prompts everywhere" confused him; he expected X / Square. A quick web pass (standard search, mostly community
wikis and guides, so secondary) plus what the games are known to do:

- **Sea of Thieves** (Xbox): Interact is X, Primary use RT, Jump A; B drops the held item. The closest match to Boogle (co-op, hands full of things, interact on the west button) ([Xbox Wire, 2018](https://news.xbox.com/en-us/2018/03/16/sea-of-thieves-controls-feature-xbox-one-windows-10), [wiki](https://seaofthieves.wiki.gg/wiki/Controls)).
- **Fortnite**: Interact (tap or hold) is X / Square / Y on Switch, shared with Reload; A jumps (community guides, no Epic page found: [outsidergaming](https://outsidergaming.com/fortnite-complete-controls-guide-pc-xbox-one-ps4-switch-and-mobile/)).
- **Zelda: Tears of the Kingdom, Animal Crossing** (Nintendo): A talks, picks up and advances text; B cancels and closes; Animal Crossing also picks up from the ground with Y. On a Switch, A is the right button, so "the confirm button" is the right one there.
- **Genshin Impact**: interact and advancing text share the confirm button (F on PC); console guides tell you to tap the confirm face button to skip lines ([Twinfinite, old](https://twinfinite.net/?p=614966), [PCGamesN](https://www.pcgamesn.com/genshin-impact/skip-dialogue-machine)).
- **Stardew Valley**: X is "use item / check", A selects; its forums complain that one context button gifts what you hold to a villager instead of talking ([forum thread](https://forums.stardewvalley.net/threads/talking-to-villagers-is-incredibly-unintuitive.25259)). Lesson: the talk prompt must win over using what you hold, and a gift should be a choice in the talk (Boogle already does both).
- **Confirm and cancel by brand**: Xbox and PlayStation (worldwide since PS5) confirm with the bottom button and go back with the right one. Nintendo confirms with A on the right and cancels with B at the bottom; Sakurai notes the Switch is the only modern console where the bottom button does not confirm ([Push Square](https://www.pushsquare.com/news/2020/10/sony_abandons_decades-old_japanese_controller_logic_for_ps5), [EventHubs](https://eventhubs.com/news/2021/feb/24/masahiro-sakurai-playstation5-swap-famitsu)). Apple's HIG: A confirms, B goes back, Menu pauses (section 5).

What Boogle did (2026-11-01, [controls.md](../game-design/controls.md)):

1. Interact on X / □ (standard button 2), and as on touch it uses what you hold when nothing is in reach, so the
   one hands button never sits idle. Use what you hold (even next to something) moved to D-pad →; RT stays Bump,
   since a dig is a reflex and the triggers are the only fast spare.
2. B / ○ is back everywhere: talks, the pause view, pickers, a focused text field; in the world it puts a wound-up
   throw away. Nothing a player does in the world prompts B any more.
3. Prompts name the buttons by brand from `Gamepad.id` (vendor 054c or "DualSense" etc. for PlayStation, 057e or
   "Pro Controller" for Switch, else Xbox). Slots stay positional; a Switch pad swaps confirm and back in menus and
   talks to match Nintendo. Not yet seen on a real DualSense or Switch pad on the iPad (item 6 below still applies).
4. One talk input for every NPC (A advances and says, D-pad or stick picks, B leaves, hints on the box; you stand
   still and the camera frames the NPC): [npcs.md](../game-design/npcs.md).

## What this means for Boogle

Each item ends with the smallest test that would confirm or refute it. "On the iPad" means the M4 iPad Pro with a Magic Keyboard, in Safari, on the live site or a LAN dev server.

1. **Decide touch versus keyboard mode from events, not `(pointer: coarse)`.** Start in touch mode when `pointer: coarse` matches and `any-pointer: fine` does not, and in keyboard mode otherwise. Then switch on strong edges only:
   - Keyboard mode: any non-modifier `keydown`, or a `pointerdown` or `wheel` with `pointerType "mouse"`.
   - Touch mode: a `pointerdown` with `pointerType "touch"` or `"pen"`.
   - Not on hover `pointermove`, which a trackpad, and possibly a Pencil, produces constantly.

   Borrow Roblox's split: the mode decides which UI shows, and the last device decides which glyphs show. *Test:* on the iPad, log `pointerType` and the mode for a trackpad click, a two-finger scroll, a finger tap, a Pencil hover and a Pencil tap. The mode must not change on a hover.
2. **Let the touch overlay ignore non-touch pointers.** In `touchEl`'s `pointerdown`, return early unless `pointerType` is `touch` or `pen`, so a trackpad click never spawns the stick, whatever mode is showing. *Test:* in keyboard mode on the iPad, click the trackpad on the left third. No stick ring may appear and `input.stickX` stays 0. A scenario can dispatch a synthetic `PointerEvent` with `pointerType: 'mouse'` at the left of the overlay and assert the stick stays hidden.
3. **Give the iPad trackpad a look that needs no lock.** Two candidates, both on the existing unlocked path in `input.ts`, worth trying side by side:
   - (a) a two-finger trackpad scroll turns the camera: `wheel` `deltaX` → yaw, `deltaY` → pitch, only when `pointerType` is mouse-like and no Ctrl is held;
   - (b) a click-drag turns it, which already exists for the unlocked case.

   Don't plan on a trackpad pinch for camera distance: the source says it reaches the page as no event (item 4). Ctrl-wheel stays Chromium-only. *Test:* on the iPad, time a solo player turning 180° and back with each, and note which one they keep using without being told.
4. **Confirm that a trackpad pinch zooms the page, and stop it if it does.** WebKit's source says a Magic Keyboard pinch goes to the scroll view's zoom, not to the page, so Boogle's `gesturestart` block can't stop it. Two fixes to try:
   - add `maximum-scale=1` to the viewport meta in `index.html`. iOS Safari ignores it for touch pinches by default, but it does limit the scroll view's zoom range;
   - or accept the zoom and restore the scale on `visualViewport` `resize`.

   Don't build on `cursor: none`: the iPad pointer stays visible over the canvas whatever the CSS says, so a camera turned by scrolling has to live with the dot. *Test:* on the iPad with a Magic Keyboard, pinch over the canvas with and without `maximum-scale=1`. Log `visualViewport.scale` and any `gesture*`, `wheel` or `pointercancel` events, and record the result here.
5. **Handle the fullscreen shoulder bug.** While WebKit 311151 is open, either hide the pause view's Fullscreen button on iPadOS while a pad is active, or keep it and show a one-line note that shoulders and triggers stop in fullscreen on iPad. Offering "Add to Home Screen" instead is worth checking, since Safari 26 web apps open standalone without the Fullscreen API. The pause view now does this on every iPad, pad or not: its first press explains and offers the Home Screen, and a second press goes fullscreen anyway. Fullscreen also turns off the keyboard on iPad: WebKit grants it there only without keyboard access (`WebFullScreenManager::supportsFullScreenForElement` returns `!withKeyboard` off the desktop idiom) and `EventHandler::isKeyEventAllowedInFullScreen` then drops letters, digits and Esc before the page sees them (WebKit bug 186058, 2018); the owner's November 2026 playtest with a Magic Keyboard hit exactly this. Neither the bug nor the source confirms that the Home Screen app keeps the shoulders, so the test below is still the only proof. *Test:* on the iPad with a pad, press LB, RB, LT and RT (a) in the browser, (b) in fullscreen, (c) from the Home Screen web app, and note which report. Re-check on each iPadOS point release; the bug is assigned.
6. **Key pad glyph brands off `Gamepad.id` names.** Match "DualSense" or "DUALSHOCK" for PlayStation shapes, "Xbox" for Xbox, and fall back to the current Xbox letters. Do not parse vendor IDs, which Safari doesn't send. Whether to draw PlayStation shapes at all is still the human decision noted in the earlier report. *Test:* connect a DualSense and an Xbox pad to the iPad and to a Mac in Chrome and Safari, log `id` and `mapping`, and paste the four strings here.
7. **Add a scaled radial dead zone to the touch stick** (Sutphin's formula, starting at 0.12 of the travel radius), and raise the travel from 50 px to about 60 px on tablets (11.5 mm). On the soapbox, try a larger dead zone on the brake axis than on steering (a bowtie), so a thumb drifting down doesn't brake. *Test:* in a scenario, feed a stick offset of 5 px and assert `input.stickX` is 0. On the iPad, run the soapbox course three times with each variant and count unintended stops.
8. **Grow the touch buttons on tablets** toward XAG's 24 mm (about 125 CSS px on the M4 iPad Pro), at least for Jump and Grab, sized from the short side of the screen the way Roblox does. Keep phones at the current 76 px. *Test:* a `/look` still at 1376×1032 (13-inch) and 1210×834 (11-inch), with the button boxes measured in the DOM. On the device, play two minutes and count missed presses with each size.
9. **Fold sprint into the touch stick**, as Apple and Sky suggest: a push past the ring's edge sprints, while a push inside it walks. Touch then reaches the sprint speed that keyboard and pad already have, with no new button. *Test:* on the iPad, run a set course on touch and on keyboard. The times should be within 10% of each other.
10. **Treat a touch throw like Brawl Stars' attack stick, if a touch throw needs aim.** A tap on the main button tosses as today; a drag from it aims and releases to throw, and dragging back to the button cancels. Accept that a sloppy tap can become a short drag, and use a move threshold (the 6 px the mouse path already uses) to tell them apart. *Test:* a solo player throws the ball at a friend-sized target ten times with each scheme on the iPad, and the hits are counted.
11. **Show a driving layout while seated in the soapbox or on the wagon,** the way Fortnite swaps layouts. Grab becomes "Get out" (it is already the button), Jump becomes "Brake" or "Drift" in its label, and buttons that do nothing while seated hide (bump, toss). This can come from the registry's existing `context` field rather than a new system. *Test:* a scenario seats the player and asserts which `.tbtn` elements are visible and what their labels say.
12. **Keep a separate touch camera rate and expose one sensitivity slider per device** (mouse, touch, pad stick), each reaching ±50%, with invert Y. That is XAG's minimum and the first item for the Settings slot the pause view reserved. *Test:* a unit test over the settings store, checking that the slider's range covers 0.5×–1.5× of each default, and a `/look` still of the Settings page.
13. **Offer toggles for the holds that aren't essential:** sprint (keyboard Shift could latch like the pad's L3), and charge-to-throw as press-to-start, press-to-release. Make each one a setting, not a new default. *Test:* with the setting on, a scenario presses Shift once (down and up) and asserts `me.sprint` stays true until the move keys are released.
14. **Do not build gyro aim now.** If it ever comes, it should be opt-in, requested from a tap in Settings, linear "like a mouse", added to touch drag rather than replacing it, and paused while a finger is on the look side. *Test (only if built):* deny the permission once and check that the game offers a way back. iOS remembers the denial.
15. **Keep a no-mouse path on the keyboard:** arrow keys or J/L to turn when the cursor is not locked. This covers XAG's keyboard-only play and the iPad without a trackpad hand free. It costs no pad slot (the pad has the right stick), and it needs a `describeControl` row. *Test:* a scenario holds the turn key for one second and asserts `cam.yaw` changed by the configured rate.

### Not found

- A device confirmation that a trackpad pinch zooms the page and sends no DOM event (item 4). The source says so, but it hasn't been seen on an iPad. Settled: `cursor: none` doesn't hide the pointer.
- Which Safari release ships the fix for WebKit 314649, and whether 311151 also affects Home Screen web apps. 311151 has no fix in any Safari through 27.x, and neither the bug nor the source answers the Home Screen question.
- Safari's current `vibrationActuator` support on iPadOS; the MDN table was not readable.
- Any developer talk from HoYoverse or Supercell on their touch control reasoning; only guides and wikis were found.
- Apple's WWDC26 "Make your game great with touch" beyond its summary.
