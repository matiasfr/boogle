// Second patch-notes video of Oct 29: the island shrinks around the lighthouse hill, critters move in, diving
// (about 45 s). Record the clips first: npm run clip -- island critters feel
export default {
  size: [1280, 720],
  fps: 30,
  fade: 0.45,
  bpm: 116,
  // Story: the tighter island and its new centre, then who lives there (gulls, fish, fireflies at night), then a new
  // way to move (the dive), then QoL. Each trim puts the payoff (take-off, scatter, breach) inside its caption.
  segments: [
    {
      card: {
        kicker: 'Patch notes · Oct 29, part 2',
        title: 'Boogle',
        sub: 'A cosier island, and it’s alive',
      },
      seconds: 3,
      bg: 'island-reveal',
      bgFrom: 6,
    },
    {
      clip: 'island-reveal',
      from: 0,
      to: 8,
      caption: {
        title: 'A cosier island',
        sub: 'Smaller and closer together: everyone is a short run from everyone',
      },
    },
    {
      clip: 'island-windmills',
      from: 0.5,
      to: 5,
      caption: { title: 'The windmill farm', sub: 'Pulled in close on the east plain, facing the hill' },
    },
    {
      clip: 'island-lighthouse',
      from: 2.5,
      to: 9,
      caption: {
        title: 'The lighthouse hill',
        sub: 'Now at the heart of the island. At dusk its beams sweep across it',
      },
    },
    {
      clip: 'critters-gulls',
      from: 0,
      to: 5,
      caption: { title: 'Gulls', sub: 'They peck about on the sand. Run at them!' },
    },
    {
      clip: 'critters-fish',
      from: 0.2,
      to: 4.8,
      caption: { title: 'A school of fish', sub: 'They swim the shallows, and scatter when the ball splashes in' },
    },
    {
      clip: 'critters-fireflies',
      from: 0.5,
      to: 6.5,
      caption: { title: 'Fireflies', sub: 'At night they blink and drift over the garden and the grass' },
    },
    {
      clip: 'feel-dive',
      from: 0.2,
      to: 4.2,
      caption: { title: 'Dive!', sub: 'Hold dig while swimming to dive. Let go and burst out of the water' },
    },
    {
      card: {
        kicker: 'Also in this patch',
        title: 'Quality of life',
        list: [
          'Snappier jumps: tap for a short hop, hold to float at the top',
          'Sprinting over dug ridges no longer launches you',
          'Soft shadows under players and the ball at night',
          'Windmill sails turn smoothly; no more flicker on the lighthouse deck',
        ],
      },
      seconds: 5,
      bg: 'island-windmills',
      bgFrom: 1,
    },
    {
      card: {
        kicker: 'Out now',
        title: 'Come play',
        sub: 'matiasfr.github.io/boogle',
      },
      seconds: 3.6,
      bg: 'island-lighthouse',
      bgFrom: 6,
    },
  ],
};
