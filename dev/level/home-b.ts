// Imported first by dev/level/rail-map.ts: the rail map draws Home as layout B (docs/plans/home-station.md, the owner's
// pick on 9 November), so Place's layout reads BOOGLE_HOME=b before any module evaluates it. The live game still draws
// the turntable terminus until home-station's step 6 (the flip); the map is the plan, and says so in one line.
process.env.BOOGLE_HOME = 'b';
