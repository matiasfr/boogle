// The crossing's finale (./crossing-view.ts): the twelfth footing set gives one whistle and two rockets at the last
// bent, out to sea toward Ring Island. Pure (layout constants only), for tests.
//
// The whistle used to take the machine sounds' 45 m range (src/render/hearing.ts), but the last bent is about 121 m
// from the pier head where the twelfth footing is set: it was silent for everyone on the pier (the owner's playtest,
// 10 November 2026). Its range is sized from that distance so the pier head hears it at about half its gain.
import { CROSSING_BENTS, PIER_FRAME } from '../../sim/railway-works-layout.ts';

const last = CROSSING_BENTS.at(-1)!;
/** Where the finale plays, in world metres: the last bent. */
export const SHOW_AT = { x: last.x / 100, z: last.z / 100 } as const;
/** Metres from the pier head's jib, where the twelfth footing is set, to the last bent. */
export const SHOW_FROM_PIER = Math.hypot(SHOW_AT.x - PIER_FRAME.x / 100, SHOW_AT.z - PIER_FRAME.z / 100);
/** The finale whistle's hearing range: (1 - 1/3.5)² ≈ 0.51 of its gain at the pier head. */
export const SHOW_HEAR = SHOW_FROM_PIER * 3.5;
