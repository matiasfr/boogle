// Retained classic haul tuning and static-layout constants. The playable wagon timetable retired at v39.
export const WAGON_CRUISE = 30; // cm per tick at full speed (3 m/s)
export const WAGON_ACCEL = 30; // ticks to reach full speed from a stop, and to brake from it (3 s)
export const WAGON_DWELL = 60; // ticks standing at each stop (layout export)
export const WAGON_MAX_GRADE = 0.25; // static route grade checked by level-check

/** Cruise in cm per tick; accel in ticks to reach it from a stop. */
export type WagonPace = { cruise: number; accel: number };
