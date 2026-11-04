# The Boogler: copy for the owner's later narrative pass

4 November 2026. List only; no proposed rewrites. His existing copy remains verbatim. Player answers are included
where their route disappears or they assume a removed action. Placeholders such as `{name}` remain as authored.
The parked source is [test/fixtures/boogler-parked-copy.ts](../../test/fixtures/boogler-parked-copy.ts), outside the
player bundle.

## Now unreachable

### Former celebration lines (`LEVEL_UP`)

- Oh! You are a familiar face now!
- We are pals now! Official!
- {name}, you are my friend. I do not say that lightly.
- Close friends! Like rice and carrots in osh!
- Best friends! Best friends forever!

The array's empty-string placeholder is kept too; it is not a spoken line.

### Thread deflections

- `home`: Ha! Slow down. We only just met. Ask me again sometime.
- `home`: That is a story for a better friend. Keep visiting!
- `mom`: Family is a close-friends topic. We are not close friends. Yet.
- `mom`: Hmm. That is a little personal for now.
- `biz`: Business secrets are for trusted associates only. You are... associated. Not trusted yet.
- `biz`: I cannot tell you yet. Competitors could be listening. The crabs.

### Deflection answers (`DEFLECT_OPTS`)

- Fair enough.
- Oh, come on, tell me!

### Pushing (`PUSHED`, `PUSHED_OPTS`)

- You are very nosy, you know that?
- Hmph. Patience is a business skill, you know.
- Sorry.
- Fine, fine.

### Going quiet (`TOO_NOSY`, `QUIET`, `QUIET_OPTS`)

- Too many questions! I need some me-time. Come back later.
- Not now. I am having a think.
- Mm-mm. No talking right now. I am recharging.
- Okay. Sorry, Boogler.
- I'll come back later.

### `home0.d` and its answers

- That is a long story with a wet ending. Ask me again when we know each other better.
- Fair enough.
- I'll hold you to that.

These are 25 nonempty line occurrences across the removed routes. Some short answers remain reachable elsewhere;
the occurrences listed here belong to the parked routes.

## Reachable lines for review

### Familiarity without a relationship ladder

- `GREETINGS`: {name}! Assalomu alaykum, do'stim! That means 'my friend'.
- `GREETINGS`: {name}! My pal! What is new?
- `GREETINGS`: {name}! There you are. I saved you a spot in my day.
- `GREETINGS`: Do'stim! Come, come. Talk to me.
- `GREETINGS`: {name}! My favorite person on this whole island. Do not tell the others.
- `GREETINGS`: There is my {name}! Stand, talk.
- `GREETINGS`: {name}! My best friend and future business partner!
- `GREETINGS`: Do'stim! Every day is better when you show up.
- `FAREWELL`: Ko'rishguncha, partner!
- `home3.a`: You want to know how I got here? Okay. You are my friend now, so I will tell you the truth. It was melons.
- `home5.b`: Now... there is a ball that hits me in the head. There are mushrooms that bounce. There is you. It is not home. But it is not nothing.
- `home5.c`: At home, for goodbye you can say 'xayr'. But I like 'ko'rishguncha' better. It means 'until we see each other again'. It is a promise. Ko'rishguncha, {name}.
- `mom` retell: Oyijon would like you. She would feed you until you could not move.
- `mom` retell: I wrote her about you again. You are my most popular topic.
- `mom1.e` answer: You've got me now.
- `mom3.d`: I tell her I am eating. That is not a lie. Coconuts count. And I tell her about the island, and the mushrooms, and lately... about you.
- `mom3.f`: I wrote, 'There is somebody here named {name} who is very nice and brings me presents.' She will be so happy. She worries I have no friends.
- `mom3.f` answer: You have a friend.
- `mom4.b` answer: Tell her you made a friend.
- `mom4.d` answer: Tell her about your friend too.
- `biz2.b` answer: I like hanging out with you.
- `biz4.b` answer: You're my friend.
- `biz5.b`: When the Emporium makes enough money, I am buying a boat. I will go to Samarqand, walk into Oyijon's kitchen and say, 'I did it.' And I want you as my business partner.
- `biz5.d`: 'The Boogler and {name}: Osh and Coconut Emporium.' It sounds right. Oyijon will love you. She will make you eat four plates.

### Patting and assumptions about treatment

- `mom4.e`: 'I have a best friend here called {name}. They pat my head and bring me presents and sometimes jump on me, but I forgive them.'
- `biz4.c`: Even you? You always seem so sure. You walk right up to strangers and pat them on the head.
- `biz4.c` answer: Patting heads is easy. Business is hard.
- `mom3.f` (also above): I wrote, 'There is somebody here named {name} who is very nice and brings me presents.' She will be so happy. She worries I have no friends.

### Personal boundaries and chapter-order assumptions

- `mom0.d`: That is... a little personal. We are not there yet, I think.
- `name.c`: My real name is... no. A blob must keep some mystery. It is very long, and Oyijon is the only one who says it right.
- `name.c` answer: Someday you'll tell me.
- `home0.d2`: A boat, a storm, and a lot of melons. I will tell you properly one day. With snacks.
- `mom2.b`: When I left with the melons I said, 'Oyijon, I will come back a big success.' She laughed and said, 'Come back fed.' But I promised the first thing.
- `mom2.d`: I want to stand in her kitchen and say, 'Oyijon, I did it.' Not, 'Oyijon, I lost seven hundred melons and floated away.'
- `biz3.a` answer: Didn't you say coconut osh was a crime?
- `biz3.c`: It was a crime then. Now it is a recipe in development. That is what we call it in business.
- `biz4.a` answer: What would Oyijon say?
- `biz4.d`: She would say, 'Bolam, you lost melons, not your head. Go try again. And eat something.'

The greeting familiarity is explicitly the owner's joke. Within-thread chapter order remains; the cross-thread
references above can now precede their introduction in another thread. No item in this list authorizes a rewrite.
