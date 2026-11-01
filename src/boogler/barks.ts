// What The Boogler says outside a conversation: level-ups, pats, rides, running off. Small and loaded up front; the
// conversations (lines.ts, talk.ts) load in their own chunk, after the first frame (src/boogler/play.ts).
export const LEVEL_UP = [
  '',
  'Oh! You are a familiar face now!',
  'We are pals now! Official!',
  '{name}, you are my friend. I do not say that lightly.',
  'Close friends! Like rice and carrots in osh!',
  'Best friends! Best friends forever!',
];
export const PET = {
  happy: ['Hehe!', 'Oh! That tickles.', 'Mmm, right there.', 'Rahmat!', 'Yes. Good pat.'],
  again: ['Okay, okay, my head is fully patted.', 'I am at maximum pat.', 'Hehe... okay, enough.'],
  wary: ['Hmph. I am still mad.', 'No pats. I am angry.'],
};
export const RIDE = ['Um.', 'Hey. Hey!', 'Okay, that is enough...', 'Hhhhhhh—'];
export const RIDE_BAIL = 'Hmph. Smart.';
export const FLEE = ['Nope!', 'No rides!', 'Stay away!'];
