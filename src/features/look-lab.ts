// The look lab (docs/proposals/visual-target.md): with `?proto=look` this loads src/debug/look-lab.ts in its own chunk,
// a panel of switchable render layers (haze and sky fog, soft and cascaded shadows, ambient occlusion, bloom, TRAA,
// grading, ink and soft outlines, toon and painted light, rim light, material detail, leaf sway, a grass field), presets
// ("today", "ipad", "diorama", "toybox", ...) and a second "steam" palette row on Y, to set the visual target on a real
// device. `&look=<preset>`, `&fx=a,b,-c` and `&era=steam` pick them from the URL, for `/look` and the look-lab
// scenario. Without the flag nothing loads and nothing changes. Serves DESIGN.md "Understandable at a glance" (see
// and measure which layers make the island read better before any of them ships). Sync kind: Local.
if (new URLSearchParams(location.search).get('proto') === 'look') import('../debug/look-lab.ts');
