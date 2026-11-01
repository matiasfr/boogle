# Visual presentation of the pause overlay, controls guide and button glyphs (HTML/CSS over a three.js canvas)

Research date: 2026-10-29. Scope: how a plain DOM + CSS pause overlay and controls guide should look and behave on desktop (keyboard + mouse), gamepad at couch distance, and phone touch. Where this repo already does something relevant, the file path is cited as local evidence so recommendations can build on it.

**What Boogle already has (local evidence, read 2026-10-29):**
- `src/player/glyphs.ts` + `src/player/glyphs.css`: glyphs drawn for the active input. Keyboard keys are styled `<kbd class="g g-key">` (paper keycap, 2px ink border, 4px bottom border, 13px/800 Figtree text, 24px tall). The mouse is an inline SVG with the pressed button filled `var(--sun)`, with `role="img"` and an `aria-label`. Gamepad buttons are `<span class="g g-pad" data-b="…">` coloured circles (25px) in Xbox colours (A green, B red, X blue, Y yellow; LT a rounded grey tab). Touch shows no glyphs: on-screen buttons carry their own labels. `inputKind()` reads `body.gamepad` / `body.touch` classes.
- `src/style.css` `:root` tokens: `--ink #13243f`, `--ink-soft #4b5d7a`, `--paper #fff`, `--sun #ffc93d`, `--sea #0f9fc0`, `--sky #bfe6f5`, `--glass rgba(12,28,52,0.58)`, `--glass-line rgba(255,255,255,0.24)`, `--on-glass #f3f8ff`, `--font-display 'Lilita One'`, `--font-body 'Figtree'`.
- `index.html` loads Figtree (500–800) and Lilita One from Google Fonts and already sets `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`.
- `src/features/prompt.css`: the "paper sticker" look (white pill, 3px ink border, `box-shadow: 0 3px 0 var(--ink)`, 18px Lilita One) with a pop-in animation.

---

## 1. Button/key glyph sets and licensing; CSS `<kbd>` vs images

### Takeaway
Several free, CC0 glyph packs cover Xbox, PlayStation, Switch, Steam Deck, keyboard/mouse and touch gestures. Kenney's Input Prompts is the broadest and most current (1,500+ sprites, bitmap + vector, CC0). For a small browser game with one cozy style, the repo's own CSS keycaps and coloured pad circles already work. They restyle with the game's tokens, scale with text, and need no assets. Any PlayStation shape glyphs (△○×□) carry a trademark question that no pack page settles.

### Cited Findings
**Kenney Input Prompts**
- CC0 license; "1500×" files; 64×64 tile size; covers Xbox 360/One/Series, PlayStation 1–5, Steam Deck, Steam Controller, Steam Frame, Valve Index, Switch, Switch 2, Wii, Wii U, GameCube, Meta Quest 1–3, Playdate, keyboard & mouse, touch gestures, generic controls, "flairs". Latest is version 1.5a ("Fixed fonts, improved vectors"); 1.5 added Steam Controller, Steam Frame, Valve Index and Meta Quest; 1.0 was released in 2024. The update notes mention vectors, spritesheets and fonts. — [kenney.nl Input Prompts](https://kenney.nl/assets/input-prompts)
- The itch.io page says "Includes bitmap and vector icons", "Over 1,500 sprites", CC0 1.0 with attribution not required but appreciated. The download is `kenney_input-prompts_1.5.zip` (4.8 MB). The last listed devlog is "Content update (1.4)", Apr 07 2025; 1.5 is undated. Previews show white icons on dark backgrounds; the page names no other style variants. — [Kenney Input Prompts on itch.io](https://kenney-assets.itch.io/input-prompts)
- Kenney also publishes pixel-art variants ("Input Prompts Pixel" and "Pixel 16"; Pixel 16 is reported as 16×16, 800 assets, CC0). This comes from search snippets, not fetched: a direct fetch of kenney.nl's Pixel 16 page returned 404. — [Kenney Input Prompts Pixel 16 on itch.io](https://kenney-assets.itch.io/input-prompts-pixel-16); [kenney.nl Input Prompts Pixel](https://kenney.nl/assets/input-prompts-pixel)
- Tooling built on Kenney's prompts: a Godot plugin, Pennycook/godot-input-prompts, says its icons are public domain, from Kenney (search snippet). A Figma plugin, LauraWebdev/cosma, imports Kenney input icons (search snippet). — [godot-input-prompts devlog](https://pennycook.itch.io/godot-input-prompts/devlog/593791/godot-input-prompts-200); [cosma on GitHub](https://github.com/LauraWebdev/cosma)

**Xelu's Free Controller & Key Prompts (Those Awesome Guys)**
- The creator page says the assets are "in the public domain license under Creative Commons 0 (CC0)" and "completely free to use in any personal or commercial project". Credits go to Nicolae (XELU) Berbece, with a 2021 update by Paul Paun. The page states no attribution requirement and lists no formats. — [thoseawesomeguys.com/prompts](https://thoseawesomeguys.com/prompts/)
- On the OpenGameArt listing (CC0, dated Feb 2014): "All in 100x100 px .png format (and also included the original vector source in .fla format)". It covers Xbox 360/One, PS3/PS4/Move/Vita, Vive, Oculus, Wii/Wii U, Switch, Steam Controller, Ouya, black-and-white keyboard and mouse keys including blanks, directional arrows, and touch screen gestures. Note: "Due to Sony's trademark of the ∆○×□ icons … the corresponding buttons have been omitted from this pack", and they stay available from thoseawesomeguys.com. — [OpenGameArt: Free keyboard and controllers prompts pack](https://opengameart.org/content/free-keyboard-and-controllers-prompts-pack)
- Commenters on OpenGameArt asked for official trademark usage guidance and got no answer in the results. — [OpenGameArt node 21558](https://opengameart.org/node/21558)

**Julio Cacko "FREE Super Input Prompt Icon Pack"**
- Assets are CC0 1.0 ("Free to use, no attribution required"); code is MIT. 1,100+ icons at 128×128 px, aimed at Unreal, Unity and Godot. Also on Gumroad as pay-what-you-want. — [juliocacko.itch.io](https://juliocacko.itch.io/free-super-input-prompt-pack-icons-unreal-unity-godot); [80.lv coverage](https://80.lv/articles/free-button-icons-for-unreal-engine-and-unity/?amp=1); [Gumroad](https://juliocacko.gumroad.com/l/nuoqwx)

**Mr. Breakfast's Free Prompts**
- CC0 1.0; "Remix the source vector as much as you'd like". 400+ SVG and PNG assets covering Switch, Xbox Series, PS5, Steam Deck, a generic pad and keyboard + mouse, with dark and light buttons and a full Latin keyboard (a commenter says AZERTY too). Caveats on the page: the itch SVGs use live text that needs the Poppins font (OFL), and the vectorized-text version and packed atlases are only on GitHub. A commenter reports the PS5 L1/L2 and R1/R2 labels appear swapped. — [mrbreakfastsdelight.itch.io](https://mrbreakfastsdelight.itch.io/mr-breakfasts-free-prompts)

**Steam Input glyphs**
- Steamworks exposes `GetGlyphPNGForActionOrigin` / `GetGlyphSVGForActionOrigin`, which return a local file path to glyph art installed with Steam, not the image itself. — [Heathen Steamworks KB](https://kb.heathen.group/old-kb/old-toolkit-for-steamworks/unity/api-extensions/input.client); [Facepunch.Steamworks wiki](https://wiki.facepunch.com/steamworks/SteamInput.GetDigitalActionGlyph)
- A third-party OpenGameArt pack says Valve OK'd its glyphs as replacements and that the author believed the official set was free to use. That is the author's claim, not Valve's terms. — [OpenGameArt: Free Steam Controller Glyphs Pack](https://opengameart.org/content/free-steam-controller-glyphs-pack)

**Sizing rule that applies to any glyph**
- "The text contained inside icons and glyphs should also meet the minimum default text size", and glyphs "should also scale with text scaling up to 200 percent". XAG shows a bad example where the "X" inside a button is 13px against an 18px minimum. You may need to enlarge the surrounding text so the glyph fits the line. — [Xbox Accessibility Guideline 101](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)
- "Images shouldn't contain text except for Logotypes", because text baked into an image can't be adjusted for contrast or read by screen narration. — [Xbox Accessibility Guideline 102](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)

### Inferences
- **CSS `<kbd>` over images for keys.** A keycap drawn in CSS (as in `src/player/glyphs.css`) is real text. It scales with `font-size`/rem, picks up theme tokens, gets read by screen readers, and handles any key label (including localized layouts) with no extra assets. That fits XAG 102's "no text in images" rule and the 200% glyph scaling rule. Image packs are worth it mainly for shapes CSS draws badly: stick directions, D-pad halves, bumper/trigger silhouettes, touch-gesture pictograms (swipe, pinch, hold). Kenney's CC0 vectors can be inlined as SVG for those few, recoloured with `currentColor`.
- **Mixing a pack with the existing look.** Kenney's preview style is white-on-dark line art, while Boogle's style is paper and ink with chunky borders. Inlining a handful of SVG paths and restyling them (stroke = `var(--ink)`, fill = `var(--paper)`) keeps one style. Shipping PNG sprites would bring in a second style and fixed pixel sizes.
- **Steam Input glyphs don't apply** to a browser game on GitHub Pages: the art exists only as files on a Steam user's machine, reached through the native SDK.
- **PlayStation shapes.** Trademark is separate from copyright. A CC0 license on a pack does not resolve Sony's trademark on △○×□, and this applies to any pack that includes them, Kenney's too (not stated on Kenney's page; inference). Boogle targets a Backbone-style (Xbox-layout) pad and draws Xbox-coloured letters, which avoids the question. If PlayStation shapes are ever added, that is a decision for a human.
- **Couch-distance check against the current CSS.** `.g-key` uses 13px text in a 24px box, and `.g-pad` uses 14px text in a 25px circle. A controls guide meant to be read from a couch at 1080p would fall below XAG's 26px console minimum if it reused these sizes unchanged. A rem- or `clamp()`-based size for glyphs inside the guide would let them grow with the text (see section 2).

### Gaps
- Exact file formats inside the Kenney 1.5 zip (SVG vs other vector formats, PNG sizes, whether the "fonts" are icon fonts with a codepoint map) are not stated on either page. Unzipping it would settle this; not done here.
- Whether Thoseawesomeguys' current download still includes PlayStation shapes, and its formats/resolutions: the page doesn't say.
- No official Valve license text for Steam Input glyphs was found.
- No source found on how Sony, Microsoft or Nintendo treat glyph use in non-licensed web games.
- No source compared icon-font vs inline-SVG vs sprite delivery for glyphs in browser games.

---

## 2. Layout patterns for controls guides; safe areas, TV margins, text and touch-target sizes

### Takeaway
Hard numbers: XAG text minimums (console 26px at 1080p, PC 18px at 1080p, mobile 18px at 100 DPI scaling linearly), glyph text held to the same minimum, scaling to 200% without content loss and with scrolling in one direction only, and WCAG 2.5.8 targets of at least 24×24 CSS px. `env(safe-area-inset-*)` handles notches, and Boogle already opts into edge-to-edge with `viewport-fit=cover`. Android TV recommends a ~5% overscan margin but says most modern TVs no longer overscan. No source compared controls-guide layout patterns.

### Cited Findings
- XAG 101 minimum default text sizes, measured as body height (descender + x-height + ascender): **console 26px at 1080p / 52px at 4K; PC/VR 18px at 1080p / 36px at 4K; mobile 18px at 100 DPI, 36px at 200 DPI, 72px at 400 DPI, scaling linearly**. A 5.5" 1080p phone is about 400 DPI. "Platform-provided screen magnification tools aren't an appropriate mitigation for small text size." — [XAG 101](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)
- XAG 101 measures text by pixel height from highest ascender to lowest descender. In its example the word "Right" measures 30px. — [XAG 101](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)
- XAG 101 scaling: players can resize to 200% of the minimum "without the loss of content, functionality, or meaning". Headers stay visually distinct from body text. Text that overflows the screen must be readable another way. Players should not have to scroll **both** horizontally and vertically within one UI (one direction is fine). — [XAG 101](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)
- XAG 101 spacing for blocks over two lines: line width ≤ 80 characters, line spacing ≥ 1.5, paragraph spacing ≥ 2× line spacing, letter spacing ≥ 0.12× font size, word spacing ≥ 0.16× font size. Use sentence case for lines of text (one- or two-word labels are exempt). Align text left or right by language, not centered or justified. — [XAG 101](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)
- XAG 101 example: the guideline's own measuring walkthrough uses "a game controls menu UI from a puzzle game". The Grounded options menu is shown as meeting contrast and minimum size (bright yellow text on dark brown). — [XAG 101](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)
- WCAG 2.2 SC 2.5.8 Target Size (Minimum), level AA: "The size of the target for pointer inputs is at least 24 by 24 CSS pixels", or an undersized target passes if a 24px-diameter circle centred on it doesn't intersect another target or another undersized target's circle. The page points to the stricter 2.5.5 (AAA) for important controls. — [W3C Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- `env(safe-area-inset-top|right|bottom|left)` is "the safe distance from the … inset edge of the viewport, defining where it is safe to place content into without risking it being cut off by the shape of a non-rectangular display". It is 0 on rectangular viewports. `safe-area-max-inset-*` are the constant maximums. Fallback syntax is `env(safe-area-inset-right, 1em)`. Example: `padding: 1em 1em calc(1em + env(safe-area-inset-bottom));`. Variable names are case-sensitive. — [MDN env()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)
- `env(preferred-text-scale)` exposes the user's OS/browser font-scale factor, e.g. `font-size: calc(100% * env(preferred-text-scale))`. MDN recommends `<meta name="text-scale" content="scale">` where possible and warns that combining the two double-scales. — [MDN env()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)
- `env(keyboard-inset-*)` gives the on-screen keyboard's insets (VirtualKeyboard API). — [MDN env()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)
- Local: `index.html` line 5 already has `viewport-fit=cover`.
- `viewport-fit`: `auto` doesn't affect the layout viewport; `contain` scales to the largest inscribed rectangle; `cover` "is scaled to fill the device display", and MDN says it's "highly recommended to use the safe area inset variables" with it ("helps avoid display cutouts such as mobile device notches"). — [MDN viewport meta](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport)
- TV overscan (Android TV design guidance): keep important elements inside a ~5% margin of a 960×540dp canvas. The page itself gives inconsistent numbers: 48dp sides / 27dp top-bottom, "round off to 24dp", and "58dp on the sides and 28dp on the top and bottom". It also notes "Most modern TVs no longer have overscan issues." — [Android Developers: TV layouts](https://developer.android.com/design/ui/tv/guides/styles/layouts)

### Inferences
- **Couch-readable sizes in CSS.** A game page has no fixed "1080p". A workable way to translate XAG is to size guide text relative to the viewport, e.g. `font-size: clamp(18px, 2.4vh, 40px)`, so text at 1080p lands near the 26px console target (2.4vh × 1080 ≈ 26px) and stays at least 18px on a laptop. Body height (ascender to descender) is larger than the CSS `font-size` cap height, so check the rendered result with XAG's measuring method rather than trusting the number. This is an inference, not sourced guidance.
- **Layout that fits all three inputs.** Following XAG's "scroll in one direction only": a grid of cards grouped by verb (Move / Act / Talk / Menu), each a two-column "glyph | action" row list. It reflows from 2–3 columns on wide screens to 1 column on phones with vertical scroll only. Showing only the active input's glyphs (as `glyphs.js` already does) halves row width and makes the single-column phone layout practical. A controller diagram with callouts doesn't reflow to a phone and puts text far from its glyph, so it's a worse fit (inference; no source compared the two).
- **Touch.** On phones the controls guide could describe the on-screen buttons (icon + label) rather than keyboard keys. Buttons inside the menu (Resume, Controls, Leave) should clear WCAG's 24px minimum by a wide margin for thumbs. Apple's and Google's larger platform figures are not sourced here.
- **Safe areas.** Pad the overlay container with `max(<gutter>, env(safe-area-inset-*))` on each side so content clears notches and the home indicator when the phone is in landscape.

### Gaps
- **TV-safe margins:** the only source is Android TV's ~5% guidance, with internally inconsistent dp values. Whether a desktop browser casting or plugged into a TV is subject to overscan is unverified. A ~5% inset (`padding: max(5vh, env(safe-area-inset-top)) max(5vw, …)`) on the pause overlay is a cheap hedge (inference).
- **`viewport-fit=cover` on iOS:** MDN says `cover` fills the display and recommends safe-area insets with it, but doesn't state that insets are 0 without it. That specific claim is unverified (the repo sets `cover` anyway).
- Apple HIG 44pt / Material 48dp touch-target figures: not fetched, so unsourced.
- No source compared controls-guide layouts (grouped cards vs list vs controller diagram) or measured how readable each is.

---

## 3. Overlay styling over a live 3D scene: dim/blur, contrast, tokens, fonts

### Takeaway
Contrast against a moving 3D scene is measured against the **lowest-contrast part of the background**. XAG's usual fix is a solid or semi-opaque backplate behind text, plus outlines on icons. `backdrop-filter: blur()` looks good, but its cost over a WebGL canvas varies by browser (Firefox bug reports). A flat translucent dim is the safe default, with blur used sparingly or behind a flag. Boogle's existing tokens (`--glass` dim, paper and ink stickers, Lilita One + Figtree) already match this approach.

### Cited Findings
- XAG 102 contrast minimums: standard text and important visuals **4.5:1**; large text and visuals **3:1** (large means 52px at 1080p on console, 36px at 1080p on PC); inactive/disabled-element text **3:1**; placeholder/input text 4.5:1 (3:1 large); an optional high-contrast mode should reach **7:1** for all UI elements. — [XAG 102](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)
- "When text is displayed over a non-solid color background, the text contrast ratio should be measured between the text and the lowest contrasting area of the background." Example: Sea of Thieves puts a darker plate behind white menu text on a patterned turquoise background. — [XAG 102](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)
- XAG 102 approaches: an option for a solid background behind text or adjustable opacity (Minecraft's text background opacity slider), colour options, a high-contrast mode, and "add borders around text or elements". For Honor puts a black outline plus a white outline on symbols so they read on both dark and light backgrounds. — [XAG 102](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)
- XAG 102: read the platform's contrast settings at launch and apply them, and don't rely on colour alone. — [XAG 102](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)
- XAG 101: Fenyx Immortals Rising gives in-world prompt text and the button icon a black outline so they read on any background. — [XAG 101](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)
- `backdrop-filter` cost: WebKit engineers say the backdrop effect "forces the engine to perform more rendering passes, which will have an impact on performance". — [WebKit: Introducing Backdrop Filters](https://webkit.org/?p=3632)
- An open Firefox report (Firefox 120) says a WebGL site ran at 1–2 fps in Firefox but near 120 fps in Chrome and Safari, and that adding a backdrop blur, oddly, fixed it. This is one anecdote. — [Bugzilla 1867791](https://bugzilla.mozilla.org/show_bug.cgi?id=1867791)
- Other Firefox reports describe a 5px backdrop blur over many elements causing lag, and a backdrop-blur demo pushing memory past 2.5 GB. Which report makes which claim was not confirmed by fetching them. — [Bugzilla 1718471](https://bugzilla.mozilla.org/show_bug.cgi?id=1718471); [Bugzilla 1843687](https://bugzilla.mozilla.org/show_bug.cgi?id=1843687)
- A FiveM (game UI in a browser layer) forum thread: drawing a three.js blur over the game view instead "drags down performance". — [cfx.re forum: NUI Blur effect](https://forum.cfx.re/t/nui-blur-effect/5241543)
- General advice (non-WebGL-specific): limit `backdrop-filter` to smaller areas and pre-compute static blurs. — [OpenReplay blog](https://blog.openreplay.com/creating-blurred-backgrounds-css-backdrop-filter/)
- Modal `<dialog>`'s `::backdrop` pseudo-element styles the layer behind it, e.g. `dialog:open::backdrop { background-color: rgb(0 0 0 / 25%); }`. — [MDN `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
- **Fonts:** Atkinson Hyperlegible Next (Braille Institute) has been free on Google Fonts since Feb 2025 under the SIL OFL. It has 7 weights, variable and monospace versions, and 150+ languages, and is designed so commonly confused characters stay distinct. These facts come from search summaries; the pages were not fetched. — [PRINT Magazine](https://www.printmag.com/design-news/braille-institute-s-atkinson-hyperlegible-typeface-launches-on-google-fonts-for-visually-impaired/); [Fontsource](https://fontsource.org/fonts/atkinson-hyperlegible-next/about). A reviewer calls it "best suited for body text and UI components" and heavy at display sizes. — [Pimp my Type review](https://pimpmytype.com/font/atkinson-hyperlegible-next/)
- XAG 101: include at least one sans-serif option; if a stylized font is used, offer a non-stylized one; fonts need full character sets for supported languages. — [XAG 101](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)
- Local: `src/style.css` tokens `--glass rgba(12,28,52,0.58)`, `--glass-line`, `--on-glass #f3f8ff`, `--paper`, `--ink #13243f`, `--sun`, `--sea`; fonts Lilita One (display) and Figtree (body).

### Inferences
- **Recommended stack for Boogle's pause overlay:** a full-screen dim using the existing `--glass` colour (or a darker variant for the paused state), with the content on **opaque** paper cards (`--paper` background, `--ink` text and 3px ink border, the drop-shadow "sticker" from `prompt.css`). Text on opaque paper makes contrast independent of whatever the 3D scene shows. Ink #13243f on white is very high contrast (well above 7:1 by inspection; not measured here). Text set directly on the translucent `--glass` dim must be checked against the *brightest* scene behind it (sunlit sand, sky), per XAG 102. At 0.58 alpha, a white sky could bleed through enough to matter.
- **Blur:** a small `backdrop-filter: blur(6–10px)` on the dim can be a progressive enhancement, gated behind `@supports` and kept off on low-power devices. The cheaper option is to pause or slow the three.js render loop while paused, so the backdrop is static. A static frame under a dim needs no per-frame blur at all.
- **Fonts:** Lilita One (heavy display) suits headings and short labels like "Paused". Figtree is a clean sans for rows. That pairing already meets XAG's "include a sans serif" rule. If a legibility option is ever added, Atkinson Hyperlegible Next is an OFL font on Google Fonts that fits it.
- **Dark/light:** the game's world look doesn't follow OS dark mode, so a single paper-on-dim theme is consistent. `prefers-contrast: more` could raise the dim opacity and thicken borders (inference; not sourced).

### Gaps
- No controlled benchmark of `backdrop-filter` over an animating WebGL canvas in Chrome, Safari or Firefox in 2026.
- No source surveyed fonts that indie or cozy browser games actually use. Font choices beyond Atkinson are inference.
- Contrast ratios for Boogle's tokens were not computed with a tool.

---

## 4. Motion and feel for menus: timing, easing, reduced motion, focus and gamepad navigation, sound

### Takeaway
Use 200–300 ms for a modal entering, slightly shorter for leaving, ease-out on entry, never linear [NN/g]. `<dialog>` can animate open and closed with `@starting-style` + `transition-behavior: allow-discrete` on `display` and `overlay`, but `::backdrop` can't fade out on close. `prefers-reduced-motion: reduce` means swap motion for gentler motion (opacity), not remove all feedback. Gamepad navigation in DOM menus needs a small spatial-navigation layer that moves real `:focus`; several vanilla libraries exist, though a menu this small can be hand-rolled.

### Cited Findings
- NN/g durations: generally 100–500 ms; simple feedback ~100 ms; "substantial screen changes (e.g., a modal entering)" 200–300 ms; 400 ms only for very large movements; past 500 ms animations "feel like a drag". Entering should be slightly longer than exiting (e.g. 300 ms in, 200–250 ms out). Avoid linear; ease-out for most entrances; ease-in or ease-in-out sometimes for exits (ease-in can feel unresponsive). — [NN/g: Executing UX Animations: Duration and Motion Characteristics](https://www.nngroup.com/articles/animation-duration/)
- `<dialog>` transitions: `<dialog>` toggles `display: none`, so a CSS transition needs `@starting-style` for the open state, `display` and `overlay` in the transition list with `allow-discrete` (`overlay` delays removal from the top layer until the transition ends). Keyframe animations need no `@starting-style`. "The backdrop is immediately removed from the DOM when the `<dialog>` is closed, so there is nothing to animate" (for a fade-out). — [MDN `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
- `prefers-reduced-motion` detects a device setting to "minimize the amount of non-essential motion" and asks for an interface that "removes, reduces, or replaces motion-based animations". MDN's example replaces a scaling pulse with an opacity dissolve. It maps to macOS/iOS Reduce Motion, Windows Animation Effects, Android "Remove animations", and GNOME/KDE settings. — [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
- Spatial navigation libraries for DOM menus: Coherent Gameface Interaction Manager (moves standard DOM `:focus` by geometry, built-in gamepad/D-pad support); Dividat focus-shift (zero-dependency vanilla, `data-focus-trap` to keep focus in a layer, `memorize` to restore the last focus in a group); Luke Chang's js-spatial-navigation (pure JS); focusmove (scope stack for nested menus); BBC lrud-spatial (edge-geometry targeting); Norigin (React-oriented). Most need gamepad input mapped to arrow keys or direction calls. — [Coherent spatial navigation docs](https://frontend-tools.coherent-labs.com/interaction-manager/features/spatial-navigation); [focus-shift](https://awesome.ecosyste.ms/projects/github.com%2Fdividat%2Ffocus-shift); [js-spatial-navigation README](https://cdn.jsdelivr.net/npm/spatial-navigation-js@1.0.0/README.md); [focusmove](https://npmjs.com/package/focusmove); [BBC lrud-spatial](https://awesome.ecosyste.ms/projects/github.com%2Fbbc%2Flrud-spatial)
- **Pointer lock and Escape:** `pointerlockchange` fires on `document` when lock changes, including "the user pressing the ESC key". If the user left lock through the default unlock gesture, "an event generated as a result of an engagement gesture must be received by the document before `requestPointerLock` will succeed". — [MDN Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)
- Local: `src/features/prompt.ts`/`.css` restarts a `.pop` pop-in class when the target changes (a squash-style entry already in the game's vocabulary).

### Inferences
- **Concrete timing:** open around 220–280 ms with an ease-out overshoot-free curve (e.g. `cubic-bezier(0.2, 0.8, 0.2, 1)`), cards translating up 8–16px and fading in, optionally staggered 20–30 ms per card. Close around 150–200 ms. Under `prefers-reduced-motion: reduce`, keep a short opacity fade and drop translate/scale. The curve and pixel values are inference within NN/g's ranges, not sourced.
- **Backdrop fade-out:** because `::backdrop` can't fade on close, either accept an instant backdrop removal, or draw the dim as a normal element inside the dialog (or a separate overlay div) that can transition out.
- **Pause trigger with pointer lock:** the browser consumes Escape to release pointer lock, and re-locking needs a fresh engagement gesture. So on desktop the pause overlay should open from `pointerlockchange` (lock lost and not intentionally released), not from a `keydown` Escape handler. "Resume" must be a real click or button press that calls `requestPointerLock()`. `<dialog>`'s own Escape-to-close (`cancel` event) can then conflict: the first Escape unlocks, a second could close the dialog. The game should decide whether Escape inside the menu means "resume" (which can't re-lock without a gesture) or nothing (`closedby="none"` or `preventDefault` on `cancel`). Using the gamepad Start/Menu button and touch pause buttons avoids the issue.
- **Gamepad focus:** a pause menu with roughly 3–6 buttons in one column, plus a controls guide that scrolls vertically, can be driven by mapping D-pad/stick up/down to focus prev/next and A/B to activate/back, with a repeat delay. No library is needed (the "Small and readable / no new deps" rule in AGENTS.md argues for hand-rolling). Programmatic `element.focus()` from gamepad code may not trigger `:focus-visible` in every browser (unverified), so styling a game-specific `.is-focused` class or `[data-focus]` as well as `:focus-visible` is safer. The focus ring itself should be thick and high-contrast (for example a 3–4px `--sun` outline plus an ink outline) so it's visible from a couch.
- **Sound on navigate:** a soft tick on focus move and a distinct confirm/back sound are standard practice. The repo's `audio-design` skill covers bus routing; menu sounds belong on a UI bus that isn't ducked by the pause (inference; unsourced).

### Gaps
- Material 3 duration and easing tokens: the fetch returned no content, so no numbers from Material.
- No source found on `:focus-visible` matching after programmatic `focus()` triggered by gamepad input.
- No source found for game-specific guidance on navigation sounds (volume, pitch variation).
- No source on how long a pause-menu open animation can take before it delays the player's next input (a feel question; inference above).

---

## 5. Accessibility: contrast, scalable text, screen-reader semantics, focus trapping

### Takeaway
A modal `<dialog>` opened with `showModal()` provides most of the semantics for free: top layer, the rest of the page inert, initial focus, Escape/`cancel`, and an implicit `aria-modal="true"`. Pair it with XAG contrast (4.5:1 / 3:1 / 7:1 high contrast, measured against the worst part of the background) and XAG text sizing (minimums, 200% scaling, glyphs scale too).

### Cited Findings
- `showModal()` makes "the rest of the page inert". Focus "is set on the first nested focusable element". Esc dismisses by default, firing `cancel` first so code can respond. With several modals open, Esc closes only the last. `closedby` is `any | closerequest | none`, and defaults to `closerequest` for `showModal()`. Put `autofocus` on the element the user is expected to use first (or the close button). Don't add `tabindex` to the `<dialog>`. Dialogs opened with `showModal()` "implicitly have `aria-modal="true"`". Always provide an explicit close button. — [MDN `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
- Contrast numbers: see section 3 ([XAG 102](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)). Text size, spacing, scaling and glyph scaling: see sections 1–2 ([XAG 101](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)).
- `env(preferred-text-scale)` and `<meta name="text-scale" content="scale">` respect the OS/browser text-size preference. — [MDN env()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)
- WCAG 2.5.8 targets ≥ 24×24 CSS px (AA). — [W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Local: `src/player/glyphs.ts` already gives SVG and pad glyphs `role="img"` + `aria-label`; keys are `<kbd>` text.

### Inferences
- Use `<dialog>` + `showModal()` for the pause menu rather than a `div` with a hand-written focus trap. The HUD and canvas become inert automatically, so `inert` doesn't need to be toggled by hand. Give the dialog an accessible name (`aria-labelledby` pointing at the "Paused" heading).
- The controls guide reads well to screen readers as a definition list or table ("E — Pick up / talk"). Glyphs need text equivalents (they already have `aria-label`s or are `<kbd>` text).
- Size with `rem` (or `clamp()` with rem bounds) so browser zoom and text-scale preferences enlarge both text and the CSS keycaps together. That satisfies XAG's glyphs-scale-with-text rule without extra code.
- Because `<dialog>` handles focus restoration and inertness, the main things left to build are gamepad focus movement (section 4) and the pointer-lock Escape interaction.

### Gaps
- MDN's separate `inert` attribute page and WAI-ARIA APG dialog pattern were not fetched. Inert behaviour is sourced only through the `<dialog>` page.
- No test of how screen readers announce a `<dialog>` over a WebGL canvas in practice.

---

## 6. Well-regarded browser/indie game menus worth studying

### Takeaway
The Game UI Database is the main study resource. It holds 55,000+ screenshots and videos and can filter by screen type and controls. The XAG pages also name specific games as good examples of menu text, contrast and prompts. No source surveyed browser-game menus specifically.

### Cited Findings
- Game UI Database: Edd Coates' collection of 55,000+ screenshots and videos of menus, inventories, game-over screens, HUDs, maps and more. Version 2.0 (after "nearly 3 years of work") added filters for "screen types, controls, textures, patterns, HUD elements, colour and more". — [Aftermath: Game UI Database](https://aftermath.site/game-ui-database)
- Course material recommends it for studying main menus, HUDs, inventories and pause menus by genre. — [natalieagus.github.io UIDB resource](https://natalieagus.github.io/50033/resources/uidb)
- Examples XAG holds up as good: **Grounded** menus (contrast and minimum sizes; yellow on dark brown), **Fenyx Immortals Rising** (outlined in-world button prompt "Y Collect"), **Sea of Thieves** (darker plate behind menu text on a patterned background; chat wheel), **Minecraft** (text-background opacity slider; outlined sliders), **Gears Tactics** (high-contrast slider handles), **For Honor** (double black/white outline on icons), **Eagle Island** (backdrop dimming and outline options), **Hyperdot** (7:1 light and dark high-contrast modes). — [XAG 101](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101); [XAG 102](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)
- Typical pause menu contents: Continue/Resume, Options/Settings, Disconnect/Main menu/Exit (Don't Starve Together's pause screen is Continue, Options, Disconnect, with separate quit confirmation for host and clients). — [DST pause screen docs](https://vietnd69.github.io/dst-api-webdocs/docs/game-scripts/screens/pausescreen)

### Inferences
- Don't Starve Together's host/client quit split maps directly onto Boogle's host-browser model: "Leave" for the host could warn that the room migrates or ends, depending on how the room handles host loss (check `src/net/README.md`). That's a content concern, but it shapes the menu's layout (a confirm step).
- The XAG examples suggest a cozy style can stay highly legible with **solid plates behind text** and **outlined glyphs**. Both fit Boogle's existing paper-sticker style.

### Gaps
- No sourced survey of browser (web) game menus. Specific indie titles praised for controls screens (e.g. ones often cited by designers) are not listed because no source was fetched for them.
- The Game UI Database's pause or controls filter results were not browsed directly.
