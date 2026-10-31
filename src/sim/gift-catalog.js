// Everything you can give The Boogler. Ground items in the shared world store an index into GIFTS, so only append.
//
//   src      'tree' grows on the palms, 'stall' comes from the seed stall, 'perch' waits on a perch (the lighthouse
//            deck), 'tool' and 'ball' are carried, never spawned. 'sea' entries are retired stubs (wash-ups are gone).
//   taste    how The Boogler feels about it ('love' | 'like' | 'meh' | 'dislike'); line: what he says when you hand
//            it over
//   key      he refuses it, and line is why
//   retired  gone from the game, kept for its index: saved hotbars drop it, nobody can throw it (see carryable)
export const GIFTS = [
  {
    id: 'coconut',
    name: 'coconut',
    color: '#7a4a26',
    src: 'tree',
    taste: 'meh',
    line: 'A coconut. I have eaten four hundred coconuts on this island. This one is four hundred and one.',
  },
  {
    id: 'mango',
    name: 'mango',
    color: '#ffb02e',
    src: 'tree',
    taste: 'like',
    line: 'Ooh, a mango! Sticky, sweet, and nobody else has one. That is called a monopoly.',
  },
  {
    id: 'banana',
    name: 'banana',
    color: '#ffe066',
    src: 'tree',
    taste: 'like',
    line: 'A banana! It comes with its own handle. Very good product design.',
  },
  {
    id: 'pomegranate',
    name: 'pomegranate',
    color: '#c8243a',
    src: 'tree',
    taste: 'love',
    line: 'Anor! A pomegranate! In Samarqand every courtyard has one. You split it and it is full of little rubies.',
  },
  {
    id: 'apricot',
    name: 'apricot',
    color: '#ff9a4a',
    src: 'tree',
    taste: 'love',
    line: "O'rik! An apricot! Oyijon dried these on the roof every summer. The whole street smelled like honey.",
  },
  // Seashore finds, retired 2026-10-31 (wash-ups are gone): kept only for their indices.
  { id: 'shell', src: 'sea', retired: true },
  { id: 'starfish', src: 'sea', retired: true },
  { id: 'driftwood', src: 'sea', retired: true },
  { id: 'seaweed', src: 'sea', retired: true },
  { id: 'flipflop', src: 'sea', retired: true },
  { id: 'boot', src: 'sea', retired: true },
  { id: 'duck', src: 'sea', retired: true },
  { id: 'sunglasses', src: 'sea', retired: true },
  { id: 'sponge', src: 'sea', retired: true },
  { id: 'float', src: 'sea', retired: true },
  { id: 'bottle', src: 'sea', retired: true },
  { id: 'card', src: 'sea', retired: true },
  { id: 'melon', src: 'sea', retired: true },
  { id: 'teacup', src: 'sea', retired: true },
  { id: 'book', src: 'sea', retired: true },
  { id: 'abacus', src: 'sea', retired: true },
  { id: 'doppi', src: 'sea', retired: true },
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
    id: 'shovel',
    name: 'shovel',
    color: '#c9a36b',
    src: 'tool',
    key: true,
    retired: true,
    taste: 'meh',
    line: 'Your shovel? No, no. Without a shovel you are just a person standing on sand. Keep it.',
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

export const giftIndex = (id) => GIFTS.findIndex((g) => g.id === id);
// Whether a catalog entry can sit in a hotbar and be thrown: everything but the ball (its own owner rules) and retired
// entries.
export const carryable = (g) => !!g && g.src !== 'ball' && !g.retired;
