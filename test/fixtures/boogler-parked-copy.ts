// Kept for the owner's later narrative pass. Unreachable copy, deliberately outside the player bundle.
export const PARKED_COPY = {
  LEVEL_UP: [
    '',
    'Oh! You are a familiar face now!',
    'We are pals now! Official!',
    '{name}, you are my friend. I do not say that lightly.',
    'Close friends! Like rice and carrots in osh!',
    'Best friends! Best friends forever!',
  ],
  DEFLECT: {
    home: [
      'Ha! Slow down. We only just met. Ask me again sometime.',
      'That is a story for a better friend. Keep visiting!',
    ],
    mom: ['Family is a close-friends topic. We are not close friends. Yet.', 'Hmm. That is a little personal for now.'],
    biz: [
      'Business secrets are for trusted associates only. You are... associated. Not trusted yet.',
      'I cannot tell you yet. Competitors could be listening. The crabs.',
    ],
  },
  DEFLECT_OPTS: ['Fair enough.', 'Oh, come on, tell me!'],
  PUSHED: ['You are very nosy, you know that?', 'Hmph. Patience is a business skill, you know.'],
  PUSHED_OPTS: ['Sorry.', 'Fine, fine.'],
  TOO_NOSY: 'Too many questions! I need some me-time. Come back later.',
  QUIET: ['Not now. I am having a think.', 'Mm-mm. No talking right now. I am recharging.'],
  QUIET_OPTS: ['Okay. Sorry, Boogler.', "I'll come back later."],
  HOME0_D: {
    say: 'That is a long story with a wet ending. Ask me again when we know each other better.',
    mood: 'worry',
    opts: [
      {
        say: 'Fair enough.',
      },
      {
        say: "I'll hold you to that.",
      },
    ],
  },
};
