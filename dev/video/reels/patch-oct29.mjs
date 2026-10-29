// Patch-notes video for everything that landed on main between 11 pm Oct 28 and noon Oct 29 (about 50 s).
// Record the clips first: npm run clip -- island boogler gifts
export default {
  size: [1280, 720],
  fps: 30,
  fade: 0.45,
  bpm: 112,
  // Story: the bigger island, gathering presents, then The Boogler (the ride is the punchline), then QoL.
  // Each trim puts the payoff (hearts, the coconut, the launch) inside its caption.
  segments: [
    {
      card: {
        kicker: 'Patch notes · Oct 29',
        title: 'Boogle',
        sub: 'A bigger island and a new friend',
      },
      seconds: 3,
      bg: 'island-reveal',
    },
    {
      clip: 'island-reveal',
      from: 0,
      to: 7,
      speed: 1.15,
      caption: {
        title: 'The island grew 12×',
        sub: 'Home is now a peninsula of a big mainland: meadows, a cape, a rocky massif',
      },
    },
    {
      clip: 'island-windmills',
      from: 0.5,
      to: 5,
      caption: { title: 'Windmill farm', sub: 'Three windmills among striped fields, turning on the shared clock' },
    },
    {
      clip: 'island-lighthouse',
      from: 2.5,
      to: 9,
      caption: { title: 'The lighthouse', sub: 'Climb the spiral stair. At dusk its beams sweep the sea' },
    },
    {
      clip: 'gifts-palm',
      from: 0.2,
      to: 4.6,
      caption: { title: 'Shake the palms', sub: 'Coconuts, mangos, pomegranates: knock them loose, pocket them' },
    },
    {
      clip: 'gifts-beach',
      from: 0,
      to: 4.2,
      caption: { title: 'Beachcombing', sub: 'Odd things wash up on the home beaches' },
    },
    {
      clip: 'boogler-pet',
      from: 0.3,
      to: 5,
      caption: { title: 'Befriend The Boogler', sub: 'Pet him and level up from Stranger to Best friend' },
    },
    {
      clip: 'boogler-talk',
      from: 0.6,
      to: 6.4,
      caption: {
        title: 'Talk and bring presents',
        sub: 'He has stories from home, and a soft spot for pomegranates',
        top: true,
      },
    },
    {
      clip: 'boogler-ride',
      from: 2,
      to: 9.8,
      caption: { title: 'Free rides?', sub: 'Stand on his back... he puts up with it, for a while', top: true },
    },
    {
      card: {
        kicker: 'Also in this patch',
        title: 'Quality of life',
        list: [
          'Install Boogle as an app, gamepad focus stays in the game',
          'Gamepad sprint is a click toggle',
          'Stuck keys and buttons release themselves',
          'Touch devices: the page no longer hides',
          'Lighter rendering: coarser sea, merged mushroom spots, no idle shadow pass',
        ],
      },
      seconds: 5.5,
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
      bgFrom: 5,
    },
  ],
};
