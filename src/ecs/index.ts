// E, the in-house ECS-shaped store (docs/plans/ecs-e.md): the one way in. Components are data-only tables keyed by
// stamped ids, queries walk ascending ids, systems declare what they read and write, and structural changes wait for
// the end of the system. Hash, snapshot, load and clone come from the component schemas, which are also the
// replication schemas (src/world/replicate.ts). Capped by a closed feature list and its size (708 non-blank lines;
// the plan, section 2): a need past it is a reason to adopt a library, not to grow this.
export {
  defineComponent,
  validValue,
  MAX_STR,
  type Component,
  type AnyComponent,
  type FieldType,
  type FieldValue,
  type Row,
  type Spec,
} from './schema.ts';
export {
  createWorld,
  defineSystem,
  createSchedule,
  type World,
  type System,
  type RowOf,
  type Snapshot,
} from './world.ts';
