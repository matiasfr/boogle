## Colour

Everything is linear. Lights, materials and palettes are physical-ish linear values; the output pass does tone
mapping and sRGB. `THREE.Color` set from a hex string converts sRGB to linear for you; a raw `vec3` literal in TSL
is linear. three's own fog (`scene.fog`) applies to node materials; set `fog: false` on a material that does its own.
The day/night palettes live in [`sky.ts`](../sky.ts) (`C`, `L`).
