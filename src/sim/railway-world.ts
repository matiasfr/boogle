// The railway on E, re-exported under its old names so importers need not change (docs/plans/ecs-migration-railway.md,
// M2; M12 removes this file). The components and the fresh world are ./railway-components.ts, the derived `Railway`
// read model ./railway-read-model.ts, and the load check ./railway-check.ts.
export {
  Account,
  Beam,
  Boiler,
  Cart,
  createRailwayWorld,
  DEPOT_OUT,
  Forge,
  ForgeClock,
  Hardwood,
  Job,
  JobRun,
  Line,
  Outcome,
  Pile,
  QJob,
  QJobRun,
  Rail,
  RAIL_COMPONENTS,
  RAIL_REPLICATED,
  RAIL_STATUS,
  RailClock,
  Rock,
  Shed,
  Train,
  Tree,
  Works,
  WorksClock,
} from './railway-components.ts';
export { copyRailway, fillRailway, railwayView, refreshRailway } from './railway-read-model.ts';
export { railwayCheck, railwayInvariant, validateRailway } from './railway-check.ts';
