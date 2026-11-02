// What `npm run level-check` knows about and lets pass, each with its reason. Anything not listed fails. Keep it small:
// fix a problem rather than listing it. An entry that matches less than it says fails too, so the list can only shrink.
export type Allow = {
  level: string; // 'today', a layout's file name, or 'all'
  rule: string;
  match: string; // part of the issue's id
  reason: string;
  max?: number; // how many it matches across those levels; default 1
};

// The layouts are sketches from the lab, walked in greybox: nobody has graded or cleared their lines. Look again when one
// is picked, and don't copy them.
const sketch = (level: string, rule: string, match: string): Allow => ({
  level,
  rule,
  match,
  reason: 'A sketch from the layout lab: nobody has graded or cleared this line.',
});

export const ALLOW: Allow[] = [
  {
    level: 'all',
    rule: 'overlap',
    match: 'the court x the stall',
    max: 5,
    reason:
      "The stall stands at the court's edge on purpose. Its 1.5 m disc is what the Boogler walks around, not ground it needs.",
  },
  {
    level: 'all',
    rule: 'overlap',
    match: 'rock (-59.4, -98.3) x rock (-62.0, -95.2)',
    max: 5,
    reason:
      'Two boulders touching on the massif: the scatter spaces rocks by their centres. It looks fine. Moving them moves everything seeded after.',
  },
  {
    level: 'today',
    rule: 'grade',
    match: 'section 2',
    reason: 'The 0.1 testbed line goes straight up the lighthouse hill. The home redesign replaces it.',
  },
  {
    level: 'today',
    rule: 'grade',
    match: 'section 3',
    reason: 'The 0.1 testbed line goes straight up the lighthouse hill. The home redesign replaces it.',
  },
  sketch('east-bay', 'overlap', 'section 2 x rock'),
  sketch('east-bay', 'water', 'work site 2'),
  sketch('lighthouse-line', 'grade', 'section 2'),
  sketch('lighthouse-line', 'grade', 'section 3'),
  sketch('net-line', 'overlap', 'section 3 x Windmill farm'),
  sketch('net-line', 'grade', 'section 2'),
  sketch('west-cove', 'overlap', 'section 3 x rock'),
  sketch('west-cove', 'grade', 'section 1'),
  sketch('west-cove', 'grade', 'section 3'),
  sketch('west-cove', 'grade', 'Lighthouse path'),
  {
    level: 'west-cove',
    rule: 'overlap',
    match: ' x rock (',
    max: 2,
    reason: 'As above: boulders touching, moved by the layout.',
  },
];
