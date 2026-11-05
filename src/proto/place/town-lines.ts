// Everything the town says, in one plain file, for the writing pass (owner, 2 November: funny writing gets a real pass later).
// All of it is a draft. Change anything here; nothing else knows the words. Pip's first line is the owner's. No line here is
// spoken by The Boogler, and none says what he really is: rumours are other people's impressions, they contradict each other on
// purpose, and only the prices hint at where it's heading. See docs/research/town-interiors.md, "Rumours without committing the
// story", and docs/proposals/boogle-2.md, "The shape of the game".

/** Things anyone can see have happened to the town, oldest first (./growth.ts decides which are true). */
export type Fact = 'path' | 'forge' | 'depot' | 'head' | 'trains' | 'town' | 'stone' | 'pier';

export type ResidentId = 'pip' | 'button' | 'nell' | 'moss' | 'wren';
export type ResidentLines = {
  name: string;
  /** First time you talk to them: a panel or two. */
  intro: string[];
  /** Said out loud the first time you walk in, without pressing anything. */
  hello?: string;
  /** Nothing new to say: one of these, in turn. */
  ordinary: string[];
  /** They've noticed this about the town. Said once, the newest first, to each player. */
  notice: Partial<Record<Fact, string>>;
  /** Things you can ask. */
  asks: { ask: string; say: string }[];
  /** "The Boogler?" In turn. */
  rumour: string[];
};

export const RUMOUR_ASK = 'The Boogler?';
export const BYE = 'Bye';
export const GO_ON = 'Go on';
/** Draft for the shore-arrival playtest only; not The Boogler's copy. */
export const SHORE_ASK = "Machine's asleep. Give us a hand?";

export const RESIDENTS: Record<ResidentId, ResidentLines> = {
  // The first resident, in the house: earnest, unemployed, fully set up.
  pip: {
    name: 'Pip',
    intro: ['I just moved in here for the jobs.', "Haven't found one yet. But the desk's ready."],
    hello: 'Oh! Come in. Mind the filing.',
    ordinary: [
      "Make yourself at home. I've only worked out half of it.",
      "I stamp these so they know they've been looked at.",
      'That fell off the tree already in alphabetical order. Saved me a morning.',
      "I'd offer you a seat, but it's a very senior seat.",
    ],
    notice: {
      path: "You built a bridge to where the jobs are? Good. I'll go over once I've settled in.",
      forge: "A whole forge, lit. Nobody's asked if I can do forging. I can't, but they should ask.",
      depot: 'Two of them pushing a cart. That is two jobs. Right there. And me at my desk.',
      head: 'Far Head. I hear the jobs out there are very far.',
      trains: 'I can commute now. All I need is something at the other end.',
      town: 'New neighbours. All employed. I checked.',
      stone: "They're building in stone now. That's a very permanent lack of vacancies.",
      pier: "You went all the way out there and you didn't see a single job?",
    },
    asks: [
      { ask: 'What sort of job?', say: "Something sitting down. I've been practising." },
      { ask: 'Who are the stamps for?', say: "Nobody yet. But when they come, it'll all have been stamped." },
    ],
    rumour: [
      'The Boogler? A prophet, I reckon. Everything he points at costs more by morning.',
      "They say he knows what you're going to want before you do. And what it'll cost.",
    ],
  },
  // The shop's clerk: proud, literal, has never once charged anyone.
  button: {
    name: 'Button',
    intro: [
      "Welcome to Fine Prices. We've got the finest in the village.",
      "The things are free. Don't tell the prices.",
    ],
    hello: 'Everything on the floor is free. The prices are for looking at.',
    ordinary: [
      "Try anything on. It's the prices you can't touch.",
      'Those zeroes came in this morning. I put them next to the old zeroes for company.',
      "There's no small print. There's very large print, and it's all zeroes.",
    ],
    notice: {
      path: "You came over the new bridge? They'll have gone up, then. The prices, I mean.",
      forge: 'New hat in. Very tall. It came with a number even taller.',
      depot: 'All those logs going past, and not one of them stopped to look at a price.',
      head: 'Far Head! Imagine what a hat costs out there.',
      trains: 'A whistle came in on the first train. Its price came on the second.',
      town: "More people in the village. Think of all the things they're not paying for.",
      stone: "Stone buildings. They'll want a stone price. I've ordered a heavier board.",
      pier: 'A pier. That must have cost somebody a fortune, in about a thousand years.',
    },
    asks: [
      {
        ask: 'Who sets the prices?',
        say: 'The Boogler sends them over. I only put them on things. They go up when you come in.',
      },
      {
        ask: 'So why is it free?',
        say: "It isn't free. It's forty million with a forty million discount. Completely different.",
      },
    ],
    rumour: [
      'A mystic, The Boogler. Who else could look at a paper hat and see forty million?',
      "Some say he can hear money. I've seen him turn round when somebody found a coin.",
    ],
  },
  // A customer who hasn't noticed, and won't.
  nell: {
    name: 'Nell',
    intro: ["I've been saving for this hat for eleven years. Nearly there. Four hundred to go."],
    ordinary: [
      "Don't take it before me. Please. I've got a system.",
      "It goes up every time I get close. That's how you know it's good.",
    ],
    notice: {
      path: 'A new bridge. I could walk to work now, if I stopped saving.',
      trains: "A train fare. No. That's a brim, that is. That's a whole brim.",
    },
    asks: [{ ask: 'It says you pay nothing.', say: "That's what they want you to think." }],
    rumour: ["He can see the future, The Boogler. How else would he know what's in my pocket?"],
  },
  // The curator: literal, careful, a little too proud of the table.
  moss: {
    name: 'Moss',
    intro: ["Welcome. We've put the interesting sides facing out.", "Mind the table. That's everybody's."],
    hello: "Welcome. Don't touch the table. It's still happening.",
    ordinary: [
      "I polished one bit. Then I had to do the rest so it wouldn't feel left out.",
      "That's the whole place, so far. We add to it when you do.",
      'A stone, with its inside on the outside.',
    ],
    notice: {
      path: "That's your bridge on the table. We made it smaller so it would fit indoors.",
      forge: "We had to paint the forge's little fire. It didn't look lit enough.",
      depot: 'The cart was too small to make. So the cart is a very small box.',
      head: 'Far Head is in. We had to lean over to put it there.',
      trains: 'The little train has arrived. Very punctual. It lives in the table.',
      town: "The village keeps growing. I've started taking the tiny roofs home to finish them.",
      stone: 'Tiny stone buildings. They are heavier than they look, which is not at all.',
      pier: "The pier goes off the edge of the table. We've asked it not to.",
    },
    asks: [
      {
        ask: 'Where did the stone come from?',
        say: 'Out there. The ground here does that. Nobody asked it to.',
      },
    ],
    rumour: ['Powers, people say. I watched The Boogler look at this stone once, and its value went up.'],
  },
  // Somebody who's come to look at the stone and has opinions.
  wren: {
    name: 'Wren',
    intro: ['The Boogler grew that, you know. With his mind.'],
    ordinary: ["I've been looking at it all day. It's still doing it."],
    notice: {
      trains: "There's a train outside. I'll look at it when I've finished this.",
    },
    asks: [{ ask: 'Did he really?', say: "Moss says no. Moss also says it's a stone." }],
    rumour: ["He's no prophet. No mystic. He's got powers. You can tell, because nobody's ever seen them."],
  },
};

/** The first time someone in the street sees you after the town changes. */
export const STREET_NOTICE: Record<Fact, string> = {
  path: 'You can walk it! All the way!',
  forge: "Smell that? That's a lit forge.",
  depot: 'Did you see the cart?',
  head: 'They got to Far Head! Whoever they are!',
  trains: 'Trains! Actual trains!',
  town: 'Look how many of us there are.',
  stone: 'Proper stone, that.',
  pier: "Where's that pier going?",
};
/** Now and then, passing in the street. */
export const STREET_RUMOURS = [
  'They say The Boogler can walk through walls. Expensive ones.',
  "My cousin says he's never once blinked.",
  "A prophet, him. I heard it from someone who'd paid.",
  "He's a mystic. Or mistaken. I heard it from a long way off.",
  "They say the sea's only there because he hasn't got round to charging for it.",
];

// ---------------------------------------------------------------- what the buildings say
export const BOARDS = {
  shopPlot: [
    { t: 'FINE PRICES', px: 150 },
    { t: 'COMING SOON', px: 90, color: '#c4453a' },
  ],
  museumPlot: [
    { t: 'A MUSEUM', px: 150 },
    { t: 'ONCE THERE IS SOMETHING TO SHOW', px: 58, color: '#4d5560' },
  ],
  pip: [
    { t: 'PIP', px: 170 },
    { t: 'OPEN TO OFFERS', px: 96, color: '#c4453a' },
  ],
  pipDesk: [
    { t: 'JOBS', px: 170 },
    { t: 'none yet', px: 120, color: '#c4453a' },
  ],
  shop: [{ t: 'FINE PRICES', px: 230 }],
  museum: [{ t: 'MUSEUM', px: 260 }],
  specimen: [
    { t: 'A stone,', px: 150 },
    { t: 'with its inside on the outside', px: 76, color: '#4d5560' },
  ],
  table: [
    { t: 'THE PLACE, SO FAR', px: 120 },
    { t: 'please do not lean on the sea', px: 66, color: '#4d5560' },
  ],
};

// ---------------------------------------------------------------- the shop
export const SHOP = {
  /** How a tag reads. Every price is a real number, it just isn't the one you pay. */
  today: 'TODAY: $0',
  keepVerb: 'Take it: $0',
  tryVerb: 'Try on',
  wearVerb: 'Wear it',
  offVerb: 'Take it off',
  /** Button, when you take something. In turn. */
  kept: [
    'Yours. The receipt would cost more paper than the hat.',
    "That's a fortune you've saved. Spend it wisely.",
    'Very official. Nobody will know.',
    "Suits you. That's extra. It isn't.",
  ],
  /** Button, when you walk out still trying it on. */
  walkedOut: "It's free! You didn't have to run!",
  covered: { forge: 'After the forge', trains: 'After the trains' },
};
