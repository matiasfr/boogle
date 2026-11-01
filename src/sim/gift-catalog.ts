// Everything you can carry, throw or give The Boogler. The index is on the wire (`gifts` items, `gift.toss`, presence
// `hd`): reorder only with a `WORLD_NS` bump (src/world/namespace.ts).
//
//   src      'stall' comes from the seed stall, 'perch' waits on a perch (the lighthouse deck), 'ball' is carried,
//            never spawned
//   taste    how The Boogler feels about it ('love' | 'like' | 'meh' | 'dislike'); line: what he says when you hand
//            it over
//   key      he refuses it, and line is why
export const GIFTS = [
  {
    id: 'seeds',
    name: 'mushroom seed',
    color: '#d8b98a',
    src: 'stall',
    taste: 'like',
    line: 'A mushroom seed! I will plant it and grow an empire. A small empire. A bouncy one.',
  },
  {
    id: 'can',
    name: 'watering can',
    color: '#4fa3d9',
    src: 'stall',
    taste: 'meh',
    line: 'A watering can. I will water myself every morning. Grow, Boogler, grow! ...Nothing. Maybe tomorrow.',
  },
  {
    id: 'frisbee',
    name: 'frisbee',
    color: '#ff4fa3',
    src: 'perch',
    taste: 'like',
    line: 'A frisbee! A plate that flies! At home we would put plov on it. Then nobody would throw it.',
  },
  {
    id: 'ball',
    name: 'beach ball',
    color: '#ff4f4f',
    src: 'ball',
    key: true,
    taste: 'meh',
    line: 'The beach ball? That belongs to everybody. If I take it, everybody is sad, and then everybody is sad at me.',
  },
];

export const giftIndex = (id: string) => GIFTS.findIndex((g) => g.id === id);
// Whether a catalog entry can sit in a hotbar and be thrown: everything but the ball (its own owner rules).
export const carryable = (g: (typeof GIFTS)[number] | undefined) => !!g && g.src !== 'ball';
