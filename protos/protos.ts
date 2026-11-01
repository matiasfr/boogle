// Every prototype the owner can playtest, for boogle.club/protos/ (docs/plans/find-the-fun.md). A new `?proto=`
// prototype adds or updates its entry here in the same PR, and flips it to 'live' when it ships (AGENTS.md, "Shipping").
// Live first on the page, then building, then retired; order within a status is the order below.

export type ProtoStatus = 'live' | 'building' | 'retired';

export type Proto = {
  id: string;
  title: string;
  /** The find-the-fun step it answers (docs/plans/find-the-fun.md), or 'depth' for a depth track. */
  step: number | 'depth';
  status: ProtoStatus;
  /** Path and query from the site root. A `<name>` placeholder gets a text box on the page. */
  url: string;
  /** The one gut question the prototype asks. */
  question: string;
  /** One line: what's new to feel. No checklists: the owner plays it and knows. */
  what: string;
  /** The day it was added (YYYY-MM-DD). */
  since: string;
  /** One extra line under the title. */
  note?: string;
  /** The prototype has a "Copy values" button whose line belongs in the playtest entry. */
  values?: boolean;
  /** Other takes on the same question (`&v=<name>`), each a button under Play; the entry asks which one won. */
  variants?: { name: string; url: string; what: string }[];
};

export const PROTOS: Proto[] = [
  {
    id: 'haul',
    title: 'The haul',
    step: 1,
    status: 'live',
    url: '/?room=proto-haul&proto=haul',
    question: 'Is hauling fun as a toy, with no goal?',
    what: "Logs on your back from the palm bundles, poured into the rail's work site. Tuning panel top right.",
    since: '2026-11-01',
    values: true,
  },
  {
    id: 'ride',
    title: 'Ride: platform carry',
    step: 2,
    status: 'live',
    url: '/?proto=ride',
    question: 'Does riding feel good enough to ride twice for no reason?',
    what: 'Stand on a moving flatbed; jump off at speed.',
    since: '2026-11-01',
    note: 'Add &ridespeed=6 to the address to change the flatbed’s speed.',
  },
  {
    id: 'wagon',
    title: 'Ride: the wagon',
    step: 3,
    status: 'live',
    url: '/?room=proto-wagon&proto=wagon',
    question: 'Would you ride it twice for no reason, and does each laid section make the ride feel like yours?',
    what: 'A greybox steam wagon on the laid rails: lay the route (panel, or −/+ for one section at a time), hop on a flatbed.',
    since: '2026-11-01',
    variants: [
      {
        name: 'lively',
        url: '/?room=proto-wagon&proto=wagon&v=lively',
        what: 'Rockier and bouncier over the joints, more smoke, a camera jolt per joint while riding.',
      },
    ],
  },
  {
    id: 'era',
    title: 'Era swap (greybox)',
    step: 4,
    status: 'live',
    url: '/?room=proto-era&proto=era',
    question: "Does the island change enough at an era's end?",
    what: 'Lay all sections, start opening day at the lighthouse platform, watch the court.',
    since: '2026-11-01',
  },
  {
    id: 'soapbox',
    title: 'Soapbox cart',
    step: 5,
    status: 'live',
    url: '/?proto=soapbox',
    question: 'Is driving fun?',
    what: 'A cart down the lighthouse path from the hill’s south shoulder (E to get in); hold Jump to drift.',
    since: '2026-11-01',
  },
  {
    id: 'look',
    title: 'Graphics ceiling',
    step: 'depth',
    status: 'building',
    url: '/?proto=look',
    question: 'Which look should Boogle aim for?',
    what: 'Code-only graphics presets on the real island.',
    since: '2026-11-01',
  },
  {
    id: 'layout',
    title: 'Island layout',
    step: 'depth',
    status: 'building',
    url: '/?room=proto-layout&layout=<name>',
    question: 'Which layout feels best to walk?',
    what: 'A layout option from the lab, in greybox.',
    since: '2026-11-01',
    note: 'The layout lab artifact link will be added here.',
  },
];
