// The look lab (docs/proposals/visual-target.md): with `?proto=look` this loads src/debug/look-lab.ts in its own chunk,
// a panel of switchable render layers (haze, soft and cascaded shadows, ambient occlusion, bloom, TRAA, grading, ink
// outlines, toon shading, material detail, leaf sway, a grass field) and presets ("today", "mid", "high", ...), to set
// the visual target on a real device. `&look=<preset>` and `&fx=a,b,-c` pick layers from the URL, for `/look` and the
// look-lab scenario. Without the flag nothing loads and nothing changes. Serves DESIGN.md "Understandable at a glance" (see
// and measure which layers make the island read better before any of them ships). Sync kind: Local.
if (new URLSearchParams(location.search).get('proto') === 'look') import('../debug/look-lab.ts');
