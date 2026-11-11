// M11: the host's reads and the tools' reads on the world equal the read model's (see test/helpers/railway-m11.ts).
import { freshProbe, hostStages, resumeAfterDays, type Stage } from './helpers/railway-m11.ts';

/** The fourteen stages the M10 reviews ran (from a fresh world to the crossing laid), and Ring Island's two (v27). */
const STAGES: readonly Stage[] = [
  'fresh',
  'awake',
  'q1-done',
  'q3-done',
  'q4-done',
  'q5-finishing',
  'glide-earned',
  'boiler',
  'trains-on',
  'q6-done',
  'works-open',
  'works-lit',
  'crossing-finishing',
  'crossing-done',
  'deck-laid',
  'ring-joined',
];
hostStages(STAGES);
resumeAfterDays(['awake', 'q1-done', 'q4-done', 'q6-done', 'works-lit', 'ring-joined']);
freshProbe();
