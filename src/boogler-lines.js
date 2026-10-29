// Everything The Boogler says. Pure data, read by src/boogler-talk.js.
//
// A chapter is a small tree of nodes starting at `a`. Node: { say, mood?, opts }. Option: { say, to?, pts?, nosy?,
// set?, trust?, else? }. No `to` ends the chapter. `trust: L` sends players below level L to `else` instead of `to`
// (and counts as extra nosiness). `set` stores flags on the friendship ({slogan}, {idea} in later lines read them).
// Moods: smile (default), joy, grump, worry. {name} is the player's name.

export const THREADS = {
  home: {
    ask: ['Where are you from?', 'Tell me more about home.', 'Tell me about Samarqand again.'],
    deflect: [
      'Ha! Slow down. We only just met. Ask me again sometime.',
      'That is a story for a better friend. Keep visiting!',
    ],
    retell: [
      'Did I tell you about the melons? Seven hundred. I still dream about them.',
      'Samarqand. Blue domes, best bread. I could talk about it all day. I basically have.',
    ],
    chapters: [
      {
        id: 'home0',
        lvl: 0,
        nodes: {
          a: {
            say: 'Me? Uzbekistan! Right in the middle of everything, and very far from the sea. The sea is very new to me.',
            mood: 'joy',
            opts: [
              { say: "Uzbekistan! That's far away.", to: 'b', pts: 1 },
              { say: 'Never heard of it.', to: 'c' },
              { say: 'How did you end up on an island, then?', to: 'd2', trust: 3, else: 'd', nosy: 1 },
            ],
          },
          b: {
            say: 'Very far. I grew up near Samarqand. Blue domes, very old, and the best bread in the world. You should visit. Bring a big bag for the bread.',
            opts: [
              { say: 'Blue domes? That sounds beautiful.', pts: 2 },
              { say: "I'll bring two bags.", pts: 2 },
              { say: 'Bread is bread.', to: 'e' },
            ],
          },
          c: {
            say: 'Never heard of... Hmph. It is a whole country! Mountains, deserts, melons as big as me. It is okay. Now you have heard of it.',
            mood: 'grump',
            opts: [{ say: 'Melons as big as you?', to: 'f', pts: 1 }, { say: 'Cool, I guess.' }],
          },
          d: {
            say: 'That is a long story with a wet ending. Ask me again when we know each other better.',
            mood: 'worry',
            opts: [{ say: 'Fair enough.' }, { say: "I'll hold you to that.", pts: 1 }],
          },
          d2: {
            say: 'A boat, a storm, and a lot of melons. I will tell you properly one day. With snacks.',
            opts: [{ say: "I'll bring the snacks.", pts: 2 }, { say: 'Melons?!' }],
          },
          e: {
            say: 'Bread is NOT bread! Our non is round like the sun, stamped with patterns, baked on the wall of a clay oven. You will see. One day.',
            mood: 'grump',
            opts: [{ say: 'Okay, okay, I believe you.' }, { say: 'Sorry, Boogler.', pts: 1 }],
          },
          f: {
            say: 'Bigger! Golden ones, sweet like honey. At the bazaar they stack them up like cannonballs. I miss them very much.',
            mood: 'joy',
            opts: [
              { say: 'I hope you get one again someday.', pts: 2 },
              { say: "I'll keep an eye out for melons.", pts: 2 },
            ],
          },
        },
      },
      {
        id: 'home1',
        lvl: 1,
        nodes: {
          a: {
            say: 'Samarqand has a square called the Registon. Three huge buildings covered in blue tiles. When the sun hits them they glow, like this sea at noon.',
            mood: 'joy',
            opts: [
              { say: 'That sounds amazing.', to: 'b', pts: 2 },
              { say: 'Bluer than this sea?', to: 'c', pts: 1 },
              { say: 'Do you have pictures?', to: 'd' },
            ],
          },
          b: {
            say: 'It is! And near it, the big bazaar. Spices, dried fruit, bread stacked to the ceiling, everybody shouting prices. That is where I learned business.',
            opts: [
              { say: 'You learned business at a bazaar?', to: 'e', pts: 1 },
              { say: 'Sounds loud.', to: 'f' },
              { say: "I'd love to see it.", pts: 2 },
            ],
          },
          c: {
            say: 'Hmm. Same blue, maybe. But the Registon does not get in your mouth when you yawn.',
            opts: [
              { say: 'Ha! Fair point.', to: 'b', pts: 2 },
              { say: "The sea's not that bad.", to: 'b' },
            ],
          },
          d: {
            say: 'I had a phone. Now it is a home for a small fish. So I keep the pictures up here instead. In my head. Somewhere in the middle.',
            mood: 'worry',
            opts: [
              { say: "That's the best place for them.", to: 'b', pts: 2 },
              { say: 'Rest in peace, phone.', to: 'b' },
            ],
          },
          e: {
            say: 'Oh yes. At the bazaar you never pay the first price. You smile, you shake your head, you walk away slowly... and they call you back. Very important skill.',
            mood: 'joy',
            opts: [
              { say: 'Teach me sometime!', pts: 2 },
              { say: 'So that explains the charm.', pts: 3 },
              { say: 'That sounds exhausting.' },
            ],
          },
          f: {
            say: 'Loud is good! Loud means business is happening. Here it is only the waves, and the waves never buy anything.',
            mood: 'grump',
            opts: [{ say: "I'll buy something someday.", pts: 2 }, { say: 'The waves seem nice, though.' }],
          },
        },
      },
      {
        id: 'home2',
        lvl: 2,
        nodes: {
          a: {
            say: 'Do you know what I miss most? Osh. You call it plov. Rice, yellow carrots, lamb, all cooked together in a big iron pot called a qozon.',
            mood: 'joy',
            opts: [
              { say: 'That sounds delicious.', to: 'b', pts: 1 },
              { say: "What's the secret?", to: 'c', pts: 1 },
              { say: 'You eat lamb?', to: 'd' },
            ],
          },
          b: {
            say: 'Delicious is too small a word. A good osh is a party. People come from three streets away when they smell it.',
            opts: [
              { say: 'I want to try it someday.', to: 'e', pts: 2 },
              { say: 'Can you make it here?', to: 'e' },
            ],
          },
          c: {
            say: 'Patience. And the right carrots. And never, ever stirring it when Oyijon says do not stir it.',
            opts: [
              { say: "Who's Oyijon?", to: 'f', set: { mom: 1 } },
              { say: 'Noted. No stirring.', to: 'e', pts: 1 },
            ],
          },
          d: {
            say: 'Lamb, yes. Not blobs! Do not worry, nobody eats blobs. I asked.',
            mood: 'worry',
            opts: [
              { say: 'Good to know!', to: 'e', pts: 1 },
              { say: '...Why did you have to ask?', to: 'e' },
            ],
          },
          e: {
            say: 'Here there is no rice, no carrots, no qozon. Only coconuts. I tried coconut osh once. I do not want to talk about coconut osh.',
            mood: 'grump',
            opts: [
              { say: 'Was it that bad?', to: 'g' },
              { say: "I'll find you some carrots.", pts: 2 },
            ],
          },
          f: {
            say: "My mother! Oyijon means something like 'mommy dear'. She makes the best osh in the whole region. She would tell you herself. Loudly.",
            mood: 'joy',
            opts: [
              { say: 'She sounds great.', pts: 2 },
              { say: 'Tell me everything about her!', nosy: 1 },
            ],
          },
          g: {
            say: 'It was a crime. The coconut was very confused. I was very confused. We do not speak of it.',
            mood: 'grump',
            opts: [{ say: 'A moment of silence.', pts: 2 }, { say: 'Ha! Okay.' }],
          },
        },
      },
      {
        id: 'home3',
        lvl: 3,
        nodes: {
          a: {
            say: 'You want to know how I got here? Okay. You are my friend now, so I will tell you the truth. It was melons.',
            opts: [
              { say: 'Melons?', to: 'b' },
              { say: 'I knew it.', to: 'b', pts: 1 },
              { say: 'Is this a sad story?', to: 'b' },
            ],
          },
          b: {
            say: 'Uzbekistan is doubly landlocked. To reach any sea, you cross two whole countries. I did not know this when I started a melon export business.',
            opts: [
              { say: 'Oh no.', to: 'c', pts: 1 },
              { say: 'That seems like a big thing to miss.', to: 'c' },
              { say: "That's actually kind of brave.", to: 'c', pts: 2 },
            ],
          },
          c: {
            say: 'Four trucks, two trains, one very small boat, and seven hundred golden melons. Then a storm. The boat went one way. The melons went every way. I went... here.',
            mood: 'worry',
            opts: [
              { say: 'Are you okay?', to: 'd', pts: 2 },
              { say: 'What happened to the melons?', to: 'e' },
              { say: 'At least you float!', to: 'f' },
            ],
          },
          d: {
            say: 'I am okay now. Blobs float. That is the one good thing about being a blob. I held on to one melon the whole way.',
            opts: [
              { say: 'What happened to that melon?', to: 'e', pts: 1 },
              { say: "I'm glad you made it.", pts: 3 },
            ],
          },
          e: {
            say: 'I ate it. On the first night. It was the best melon of my life. Then I had zero melons, and a business with zero products.',
            mood: 'grump',
            opts: [
              { say: "That's rough, buddy.", pts: 2 },
              { say: "Honestly, I'd have eaten it too.", pts: 2 },
              { say: 'Seven hundred melons... wow.' },
            ],
          },
          f: {
            say: 'I do float! Very well. I floated for three days. I would rather not float again, thank you.',
            mood: 'grump',
            opts: [
              { say: 'Sorry, that was a joke.', to: 'd', pts: 1 },
              { say: 'Three days?!', to: 'd' },
            ],
          },
        },
      },
      {
        id: 'home4',
        lvl: 4,
        nodes: {
          a: {
            say: "Every spring at home we have Navro'z, the new year. Everybody cleans, everybody cooks, and the apricot tree in our courtyard explodes with flowers.",
            mood: 'joy',
            opts: [
              { say: 'An apricot tree in your yard?', to: 'b' },
              { say: 'What do you cook?', to: 'c' },
              { say: 'That sounds really lovely.', to: 'b', pts: 2 },
            ],
          },
          b: {
            say: 'Right in the middle of the courtyard. Oyijon planted it the year I was born. I used to sit under it and count apricots. Business practice.',
            opts: [
              { say: 'Counting apricots as a kid. Of course.', to: 'd', pts: 2 },
              { say: 'Do you think it is still there?', to: 'd', nosy: 1 },
            ],
          },
          c: {
            say: 'Sumalak! Wheat sprouts cooked all night in a giant pot. Everyone takes turns stirring and singing. It is sweet and brown and it takes forever.',
            opts: [
              { say: 'All night?!', to: 'b' },
              { say: 'I want a turn stirring!', to: 'b', pts: 2 },
            ],
          },
          d: {
            say: 'It is still there. I imagine it, anyway. Getting tall. Dropping apricots on the roof. Waiting for me to come and count them.',
            mood: 'worry',
            opts: [
              { say: "It'll be there when you get back.", pts: 3 },
              { say: "You'll go back someday.", pts: 2 },
              { say: 'Some trees here grow apricots, you know.', pts: 2 },
            ],
          },
        },
      },
      {
        id: 'home5',
        lvl: 5,
        nodes: {
          a: {
            say: '{name}, can I tell you something? When I washed up here I thought, this is not home. No bazaar, no osh, no Oyijon.',
            mood: 'worry',
            opts: [
              { say: 'And now?', to: 'b' },
              { say: "I'm sorry, Boogler.", to: 'b', pts: 1 },
            ],
          },
          b: {
            say: 'Now... there is a ball that hits me in the head. There are mushrooms that bounce. There is you. It is not home. But it is not nothing.',
            mood: 'joy',
            opts: [
              { say: "It's not nothing to me either.", to: 'c', pts: 3 },
              { say: 'The ball says sorry about your head.', to: 'c', pts: 1 },
            ],
          },
          c: {
            say: "At home, for goodbye you can say 'xayr'. But I like 'ko'rishguncha' better. It means 'until we see each other again'. It is a promise. Ko'rishguncha, {name}.",
            mood: 'joy',
            opts: [
              { say: "Ko'rishguncha, Boogler.", pts: 3 },
              { say: "That's really nice.", pts: 2 },
            ],
          },
        },
      },
    ],
  },

  mom: {
    ask: ['Do you have any family?', "How's your mom?", 'Tell me about Oyijon again.'],
    deflect: [
      'Family is a close-friends topic. We are not close friends. Yet.',
      'Hmm. That is a little personal for now.',
    ],
    retell: [
      'Oyijon would like you. She would feed you until you could not move.',
      'I wrote her about you again. You are my most popular topic.',
    ],
    chapters: [
      {
        id: 'mom0',
        lvl: 1,
        nodes: {
          a: {
            say: 'Family? I have Oyijon. My mother. She is small and loud and she can carry four melons at once.',
            mood: 'joy',
            opts: [
              { say: 'Four melons?!', to: 'b' },
              { say: 'She sounds wonderful.', to: 'c', pts: 2, set: { mom: 1 } },
              { say: 'What about your dad?', to: 'd', nosy: 2 },
            ],
          },
          b: {
            say: 'Four! Two in her arms, one under her chin, and the fourth... I never figured out where the fourth one goes. That is her secret.',
            opts: [
              { say: 'She sounds like a legend.', to: 'c', pts: 2, set: { mom: 1 } },
              { say: 'I need to meet her.', to: 'c', pts: 1, set: { mom: 1 } },
            ],
          },
          c: {
            say: "She calls me 'bolam'. My child. Even now. Even though I am this big and very round.",
            opts: [
              { say: "That's sweet.", pts: 2 },
              { say: 'You must miss her.', to: 'e' },
            ],
          },
          d: {
            say: 'That is... a little personal. We are not there yet, I think.',
            mood: 'worry',
            opts: [
              { say: "Sorry, I didn't mean to pry.", to: 'c', pts: 1 },
              { say: 'Okay.', to: 'c' },
            ],
          },
          e: {
            say: 'Every day. But it is okay. I will see her again. Probably. Hopefully. Let us talk about something else.',
            mood: 'worry',
            opts: [
              { say: "I'm sure you will.", pts: 2 },
              { say: 'Sure thing.', pts: 1 },
            ],
          },
        },
      },
      {
        id: 'mom1',
        lvl: 2,
        nodes: {
          a: {
            say: 'Oyijon has one rule. If you walk into her house, you eat. Not hungry? You eat. You just ate? You eat again.',
            mood: 'joy',
            opts: [
              { say: 'My kind of rule.', to: 'b', pts: 2 },
              { say: 'What if you say no?', to: 'c' },
              { say: 'Is that where you got so... round?', to: 'd' },
            ],
          },
          b: {
            say: "Bread, tea, osh, apricots, more bread. She watches you eat and says 'bolam, why so thin?' She says it to me. Look at me!",
            opts: [
              { say: 'Even to YOU?', to: 'e', pts: 1 },
              { say: 'I miss home cooking too.', to: 'e', pts: 2 },
            ],
          },
          c: {
            say: 'Nobody says no to Oyijon. People have tried. They are still eating.',
            opts: [
              { say: 'Ha!', to: 'b', pts: 1 },
              { say: 'Terrifying.', to: 'b' },
            ],
          },
          d: {
            say: 'Rude! ...Yes. Absolutely yes.',
            mood: 'grump',
            opts: [
              { say: 'Sorry! Kidding!', to: 'b', pts: 1 },
              { say: 'It suits you.', to: 'b', pts: 2 },
            ],
          },
          e: {
            say: "Here I eat coconuts, and nobody watches, and nobody says 'eat more'. It is quiet. Too quiet.",
            mood: 'worry',
            opts: [
              { say: 'Eat more, Boogler.', pts: 3 },
              { say: "I'll bring you better food.", pts: 2 },
              { say: "You've got me now.", pts: 2 },
            ],
          },
        },
      },
      {
        id: 'mom2',
        lvl: 3,
        nodes: {
          a: {
            say: 'You wonder why I do not just go and see Oyijon. There are no boats here. And even if there were... I made her a promise.',
            opts: [
              { say: 'What promise?', to: 'b' },
              { say: 'No boats at all?', to: 'c' },
              { say: "You don't have to tell me.", to: 'b', pts: 2 },
            ],
          },
          b: {
            say: "When I left with the melons I said, 'Oyijon, I will come back a big success.' She laughed and said, 'Come back fed.' But I promised the first thing.",
            opts: [
              { say: 'She just wants you back.', to: 'd', pts: 2 },
              { say: "So you won't go home until you're a success?", to: 'd' },
              { say: "That's a lot of pressure.", to: 'd' },
            ],
          },
          c: {
            say: 'I asked a seagull. The seagull did not answer. I think that means no.',
            opts: [
              { say: 'Could you build a raft?', to: 'e' },
              { say: 'Seagulls are bad at directions.', to: 'b', pts: 1 },
            ],
          },
          d: {
            say: "I want to stand in her kitchen and say, 'Oyijon, I did it.' Not, 'Oyijon, I lost seven hundred melons and floated away.'",
            mood: 'worry',
            opts: [
              { say: "She'd be proud either way.", pts: 3 },
              { say: "Then let's make you a success.", pts: 3 },
              { say: 'The melon story is pretty good, though.', pts: 1 },
            ],
          },
          e: {
            say: 'I tried! I built a raft out of palm leaves. It turned into a hat. A nice hat. But not a boat.',
            opts: [
              { say: 'A hat is something!', to: 'b', pts: 1 },
              { say: 'Better luck next time.', to: 'b' },
            ],
          },
        },
      },
      {
        id: 'mom3',
        lvl: 4,
        nodes: {
          a: {
            say: 'Can I tell you a secret? Every week I write Oyijon a letter, put it in a coconut shell, and throw it into the sea.',
            opts: [
              { say: 'A coconut shell?', to: 'b' },
              { say: 'Has she ever written back?', to: 'c', nosy: 1 },
              { say: "That's really sweet.", to: 'b', pts: 2 },
            ],
          },
          b: {
            say: 'There are no bottles. Only coconuts. Coconuts are a terrible postal service. Most of them come back.',
            mood: 'grump',
            opts: [
              { say: 'What do you write?', to: 'd' },
              { say: 'Keep throwing. One will get there.', to: 'd', pts: 2 },
            ],
          },
          c: {
            say: 'Not yet. The sea is very big and her address is very small. But she is patient. She ran a stall at the bazaar for thirty years. Patience is her whole business.',
            opts: [
              { say: 'She ran a stall?', to: 'e' },
              { say: 'Sounds like you get it from her.', to: 'e', pts: 2 },
            ],
          },
          d: {
            say: 'I tell her I am eating. That is not a lie. Coconuts count. And I tell her about the island, and the mushrooms, and lately... about you.',
            mood: 'joy',
            opts: [
              { say: 'About me?', to: 'f' },
              { say: 'Tell her I said hi.', pts: 3 },
            ],
          },
          e: {
            say: 'She sells suzani. Big embroidered cloths, with flowers and pomegranates stitched all over them. She is the real business person. I am trying to catch up.',
            opts: [
              { say: "You'll catch up.", pts: 3 },
              { say: "So that's where you got it.", pts: 2 },
            ],
          },
          f: {
            say: "I wrote, 'There is somebody here named {name} who is very nice and brings me presents.' She will be so happy. She worries I have no friends.",
            mood: 'joy',
            opts: [
              { say: 'You have a friend.', pts: 3 },
              { say: 'Aww, Boogler.', pts: 2 },
            ],
          },
        },
      },
      {
        id: 'mom4',
        lvl: 5,
        nodes: {
          a: {
            say: '{name}, I am writing another letter to Oyijon. Will you help me? I never know how to start.',
            opts: [
              { say: 'Of course!', to: 'b', pts: 2 },
              { say: "Start with 'I miss you'.", to: 'c', pts: 2 },
            ],
          },
          b: {
            say: "Okay. 'Dear Oyijon...' Now what?",
            opts: [
              { say: "Tell her you're doing okay.", to: 'c' },
              { say: 'Tell her about the business.', to: 'd' },
              { say: 'Tell her you made a friend.', to: 'e' },
            ],
          },
          c: {
            say: "'I miss you. I am okay. I am eating.' ...She will know I mean coconuts. She always knows.",
            mood: 'worry',
            opts: [
              { say: 'Add something happy.', to: 'e' },
              { say: "That's perfect.", to: 'f' },
            ],
          },
          d: {
            say: "'The business is going very well.' Hmm. 'The business is going.' That is honest. Going is good!",
            opts: [
              { say: 'Going is very good.', to: 'f', pts: 1 },
              { say: 'Tell her about your friend too.', to: 'e' },
            ],
          },
          e: {
            say: "'I have a best friend here called {name}. They pat my head and bring me presents and sometimes jump on me, but I forgive them.'",
            mood: 'joy',
            opts: [
              { say: "I'm honored.", to: 'f', pts: 2 },
              { say: 'Sorry about the jumping.', to: 'f', pts: 1 },
            ],
          },
          f: {
            say: "'Love, your bolam. P.S. Eat something.' There. She always says that to me, so I say it back.",
            mood: 'joy',
            opts: [
              { say: "She'll love it.", pts: 3 },
              { say: 'Throw it really far.', pts: 2 },
            ],
          },
        },
      },
    ],
  },

  biz: {
    ask: ['What do you do here?', "How's business?", 'How is the Emporium going?'],
    deflect: [
      'Business secrets are for trusted associates only. You are... associated. Not trusted yet.',
      'I cannot tell you yet. Competitors could be listening. The crabs.',
    ],
    retell: [
      'The Emporium is in the planning phase. A long planning phase. The best kind.',
      "The slogan is still '{slogan}'. Still perfect.",
    ],
    chapters: [
      {
        id: 'biz0',
        lvl: 0,
        nodes: {
          a: {
            say: 'What do I do? I am an entrepreneur! Between ventures. Currently my venture is walking around.',
            mood: 'joy',
            opts: [
              { say: 'An entrepreneur?', to: 'b' },
              { say: 'Walking around is a great venture.', to: 'c', pts: 1 },
              { say: "So you're unemployed.", to: 'd' },
            ],
          },
          b: {
            say: 'Yes! I start businesses. Have you seen that seed stall? Free seeds! No price! Who runs a stall like that? It hurts me to look at it.',
            mood: 'grump',
            opts: [
              { say: 'Free stuff is nice, though.', to: 'e' },
              { say: 'You could run it better.', to: 'f', pts: 2 },
            ],
          },
          c: {
            say: 'Thank you! Low costs. Good exercise. Zero profit, but you cannot have everything.',
            opts: [
              { say: 'What else have you tried?', to: 'b' },
              { say: 'Ha!', pts: 1 },
            ],
          },
          d: {
            say: 'Between ventures! It is different! ...It is a little bit the same.',
            mood: 'grump',
            opts: [
              { say: 'Sorry. Between ventures.', to: 'b', pts: 1 },
              { say: 'Hey, me too.', to: 'b', pts: 2 },
            ],
          },
          e: {
            say: 'Nice for customers. Terrible for business. Someday I will have my own stall, with prices, and a sign, and a little bell.',
            mood: 'joy',
            opts: [
              { say: "I'd shop there.", pts: 2 },
              { say: 'What would you sell?', to: 'f' },
            ],
          },
          f: {
            say: 'I do not know yet! That is the exciting part. Something people want. You bring me ideas, and I bring the... enthusiasm.',
            opts: [
              { say: 'Deal.', pts: 2 },
              { say: "I'll think about it.", pts: 1 },
            ],
          },
        },
      },
      {
        id: 'biz1',
        lvl: 1,
        nodes: {
          a: {
            say: 'Business is a journey. Since I washed up, I have started three businesses. Would you like to hear my portfolio?',
            opts: [
              { say: 'Absolutely.', to: 'b', pts: 1 },
              { say: 'Do I have a choice?', to: 'b' },
            ],
          },
          b: {
            say: 'One: a coconut water stand. Great product, zero customers. Nobody else was on the island. Two: seashell consulting. I told the shells where to sit. They did not listen.',
            opts: [
              { say: 'And the third?', to: 'c' },
              { say: 'Those sound... ambitious.', to: 'c', pts: 1 },
            ],
          },
          c: {
            say: 'Three: professional napping. I am very good at it. But nobody pays you to nap. I checked.',
            mood: 'grump',
            opts: [
              { say: 'Maybe you were ahead of your time.', to: 'd', pts: 2 },
              { say: 'You should charge for naps.', to: 'd' },
              { say: 'So, three failures.', to: 'e' },
            ],
          },
          d: {
            say: 'That is what I said! The market was not ready. But now people come to the island. People mean customers. My time is coming.',
            mood: 'joy',
            opts: [
              { say: 'Your time is definitely coming.', pts: 2 },
              { say: "I'm a person. Am I a customer?", to: 'f' },
            ],
          },
          e: {
            say: "Three learning experiences! Failure is just a business word for 'not yet'.",
            mood: 'grump',
            opts: [
              { say: 'Okay. Not yet.', to: 'd', pts: 1 },
              { say: 'Fair.', to: 'd' },
            ],
          },
          f: {
            say: 'You are my first customer and my first focus group. Congratulations. There is no prize.',
            opts: [{ say: 'Best day ever.', pts: 2 }, { say: 'Aw, no prize?' }],
          },
        },
      },
      {
        id: 'biz2',
        lvl: 2,
        nodes: {
          a: {
            say: "Big news. A book washed up. 'Business for Beginners.' Most of the pages are stuck together, but I have read chapter one ten times.",
            mood: 'joy',
            opts: [
              { say: "What's chapter one?", to: 'b' },
              { say: 'Ten times?', to: 'b' },
              { say: 'Read me some!', to: 'b', pts: 1 },
            ],
          },
          b: {
            say: "'Know your customer.' So I am studying you. What do you like? What do you need? What makes you open your wallet? You do not have a wallet. Hmm.",
            opts: [
              { say: 'I like fruit.', to: 'c' },
              { say: 'I like the beach ball.', to: 'd' },
              { say: 'I like hanging out with you.', to: 'e', pts: 2 },
            ],
          },
          c: {
            say: 'Fruit! The palms here grow all kinds of fruit, for free. Again with the free! This island has no idea how money works.',
            mood: 'grump',
            opts: [
              { say: 'You could sell fruit smoothies.', to: 'f', pts: 2, set: { idea: 'fruit smoothies' } },
              { say: 'Free fruit is a good thing.', to: 'f' },
            ],
          },
          d: {
            say: 'The ball! Everyone loves the ball. It hits me sometimes. I could charge for that. One coin per bonk. Write that down.',
            opts: [
              { say: 'Ball insurance!', to: 'f', pts: 2, set: { idea: 'ball insurance' } },
              { say: "Please don't charge for the ball.", to: 'f' },
            ],
          },
          e: {
            say: 'Oh. That is not a business answer. But it is a good answer. Chapter two is probably about friends. The pages are stuck, so I will assume it.',
            mood: 'joy',
            opts: [
              { say: 'Chapter two: be nice.', to: 'f', pts: 2 },
              { say: 'Ha, sure.', to: 'f' },
            ],
          },
          f: {
            say: 'This is good research. You are an excellent focus group, {name}.',
            opts: [
              { say: 'Happy to help!', pts: 2 },
              { say: 'Do focus groups get paid?', to: 'g' },
            ],
          },
          g: {
            say: 'In exposure. When I am rich, you will be famous for knowing me. Very good deal for you.',
            opts: [{ say: "Can't argue with that.", pts: 1 }, { say: 'Hmm.' }],
          },
        },
      },
      {
        id: 'biz3',
        lvl: 3,
        nodes: {
          a: {
            say: "{name}, I have decided. I am opening a restaurant. 'The Boogler's Osh and Coconut Emporium.' Osh, like at home, but made with island things.",
            mood: 'joy',
            opts: [
              { say: 'The Emporium! I love it.', to: 'b', pts: 2 },
              { say: "Didn't you say coconut osh was a crime?", to: 'c' },
              { say: 'Where will you get rice?', to: 'd' },
            ],
          },
          b: {
            say: 'Thank you! Every business needs a slogan. Help me pick one. This is very important for the brand.',
            opts: [
              { say: "'Come hungry, leave round.'", to: 'e', pts: 1, set: { slogan: 'Come hungry, leave round.' } },
              { say: "'Rice to meet you.'", to: 'e', pts: 1, set: { slogan: 'Rice to meet you.' } },
              { say: "'No free rides.'", to: 'e', pts: 1, set: { slogan: 'No free rides.' } },
            ],
          },
          c: {
            say: 'It was a crime then. Now it is a recipe in development. That is what we call it in business.',
            mood: 'grump',
            opts: [
              { say: 'Recipe in development. Got it.', to: 'b', pts: 1 },
              { say: 'If you say so.', to: 'b' },
            ],
          },
          d: {
            say: 'Ah. Problem one. No rice. I will start with chopped mushroom. It looks like rice if you squint, and if you are very hungry.',
            opts: [
              { say: 'Squinting is free.', to: 'b', pts: 1 },
              { say: 'Bold choice.', to: 'b' },
            ],
          },
          e: {
            say: "'{slogan}' ...Yes. YES. I will paint it on a big sign. When I have paint. And a sign.",
            mood: 'joy',
            opts: [
              { say: "You'll get there.", pts: 2 },
              { say: "I'll find you driftwood for the sign.", pts: 2 },
            ],
          },
        },
      },
      {
        id: 'biz4',
        lvl: 4,
        nodes: {
          a: {
            say: 'Can I be honest? Sometimes at night I look at the waves and think: what if I am not a business person? What if I am just a blob who lost some melons?',
            mood: 'worry',
            opts: [
              { say: "You're not just a blob.", to: 'b', pts: 2 },
              { say: 'Everyone has doubts.', to: 'c', pts: 1 },
              { say: 'What would Oyijon say?', to: 'd' },
            ],
          },
          b: {
            say: 'No? Then what am I?',
            opts: [
              { say: "You're a blob with a plan.", to: 'e', pts: 3 },
              { say: "You're my friend.", to: 'e', pts: 3 },
              { say: "You're THE Boogler.", to: 'f', pts: 2 },
            ],
          },
          c: {
            say: 'Even you? You always seem so sure. You walk right up to strangers and pat them on the head.',
            opts: [
              { say: 'Even me.', to: 'e', pts: 2 },
              { say: 'Patting heads is easy. Business is hard.', to: 'e' },
            ],
          },
          d: {
            say: "She would say, 'Bolam, you lost melons, not your head. Go try again. And eat something.'",
            mood: 'joy',
            opts: [
              { say: 'Smart woman.', to: 'e', pts: 2 },
              { say: 'So try again!', to: 'e', pts: 2 },
            ],
          },
          e: {
            say: 'Okay. Okay! Melons: gone. Emporium: coming. Doubts... we will give them a small table in the back.',
            mood: 'joy',
            opts: [
              { say: "That's the spirit!", pts: 2 },
              { say: 'Way to go, Boogler.', pts: 2 },
            ],
          },
          f: {
            say: "With a 'The'! A good brand always has a 'The'. You are right. I am THE Boogler!",
            mood: 'joy',
            opts: [
              { say: 'THE Boogler!', pts: 2 },
              { say: 'Exactly.', pts: 1 },
            ],
          },
        },
      },
      {
        id: 'biz5',
        lvl: 5,
        nodes: {
          a: {
            say: '{name}. I have an offer. A serious one. Please sit. ...You are standing. That is fine.',
            opts: [
              { say: "I'm listening.", to: 'b' },
              { say: 'Is this a ride offer?', to: 'c' },
            ],
          },
          b: {
            say: "When the Emporium makes enough money, I am buying a boat. I will go to Samarqand, walk into Oyijon's kitchen and say, 'I did it.' And I want you as my business partner.",
            opts: [
              { say: "Partners? I'd love that.", to: 'd', pts: 3 },
              { say: 'Samarqand is landlocked. How does the boat get there?', to: 'e' },
              { say: 'What does a partner do?', to: 'f' },
            ],
          },
          c: {
            say: 'Absolutely not. The back is closed for business. Forever.',
            mood: 'grump',
            opts: [
              { say: 'Fair. Go on.', to: 'b' },
              { say: 'Worth a try.', to: 'b' },
            ],
          },
          d: {
            say: "'The Boogler and {name}: Osh and Coconut Emporium.' It sounds right. Oyijon will love you. She will make you eat four plates.",
            mood: 'joy',
            opts: [
              { say: "I'll bring a big appetite.", pts: 3 },
              { say: 'Partners, Boogler.', pts: 3 },
            ],
          },
          e: {
            say: 'I will figure out the last part later. Rivers? Trucks? A very long rope? Details. Every great plan has details.',
            mood: 'worry',
            opts: [
              { say: "I'll help with the details.", to: 'd', pts: 3 },
              { say: 'A long rope, obviously.', to: 'd', pts: 2 },
            ],
          },
          f: {
            say: 'Partners share the work, the profit and the coconuts. Mostly the coconuts, at first. Also your name goes on the sign.',
            opts: [
              { say: 'Sign me up.', to: 'd', pts: 3 },
              { say: "I'm in.", to: 'd', pts: 2 },
            ],
          },
        },
      },
    ],
  },
};

// Small talk for "How's it going?". `needs` names a friendship flag that must be set.
export const SMALL_TALK = [
  {
    id: 'ball',
    lvl: 0,
    nodes: {
      a: {
        say: 'That beach ball hit me in the head again today. I do not mind. Okay, I mind a little.',
        opts: [
          { say: 'Sorry, that might have been me.', to: 'b' },
          { say: "It's a very good ball.", to: 'b', pts: 1 },
        ],
      },
      b: {
        say: 'Here is a tip. Throw it at the palm trees instead. Fruit falls out! Free fruit. Again with the free.',
        opts: [{ say: 'Good tip!', pts: 1 }, { say: "I'll aim better." }],
      },
    },
  },
  {
    id: 'mushrooms',
    lvl: 0,
    nodes: {
      a: {
        say: 'Have you seen the mushrooms by the stall? You bury a seed, you water it, it grows into a trampoline. Amazing product. Terrible pricing.',
        opts: [
          { say: 'Terrible pricing?', to: 'b' },
          { say: "They're super fun.", to: 'b', pts: 1 },
        ],
      },
      b: {
        say: 'Free! Again! If I ran that stall, every bounce would cost a coin. Okay, half a coin. Okay, a smile. ...Fine. Free.',
        opts: [{ say: "You're a softie.", pts: 2 }, { say: 'Free is good, Boogler.' }],
      },
    },
  },
  {
    id: 'washups',
    lvl: 0,
    nodes: {
      a: {
        say: 'Things wash up on the beach all the time. Shells, boots, ducks. Once, a whole chair. I sat on it. It was a good day.',
        opts: [
          { say: 'A whole chair?', to: 'b' },
          { say: "I'll keep an eye out for presents.", pts: 1, to: 'b' },
        ],
      },
      b: {
        say: 'Then the tide took it back. The sea gives, the sea takes. The sea is a bad business partner.',
        opts: [{ say: 'Ha! True.', pts: 1 }, { say: "Maybe it'll come back." }],
      },
    },
  },
  {
    id: 'fruit',
    lvl: 0,
    nodes: {
      a: {
        say: 'Why does every tree here grow something different? Mangoes, bananas, pomegranates. On palm trees! Nothing on this island makes sense.',
        opts: [
          { say: "It's a magic island.", to: 'b' },
          { say: 'Does it matter?', to: 'b' },
        ],
      },
      b: {
        say: 'If it is magic, it should grow apricots on every tree. And rice. And a qozon. Magic should be more practical.',
        mood: 'grump',
        opts: [{ say: "I'll file a complaint.", pts: 1 }, { say: 'Shake a few trees. You might get lucky.' }],
      },
    },
  },
  {
    id: 'holes',
    lvl: 1,
    nodes: {
      a: {
        say: 'People here dig holes and build sand walls. Yesterday I walked into a hole. I just... stood in it for a while.',
        opts: [
          { say: 'Were you stuck?', to: 'b' },
          { say: 'Sorry, that was probably me.', to: 'b', pts: 1 },
        ],
      },
      b: {
        say: 'Not stuck. Thinking. A hole is a good place to think. Nobody can see you. Very private office.',
        opts: [
          { say: 'A hole office.', pts: 1 },
          { say: "I'll dig you a nice one.", pts: 2 },
        ],
      },
    },
  },
  {
    id: 'name',
    lvl: 1,
    nodes: {
      a: {
        say: "Do you know why I am THE Boogler? Not just Boogler? A good brand needs a 'The'.",
        opts: [
          { say: 'Very smart.', to: 'b', pts: 1 },
          { say: "What's your real name?", to: 'c', nosy: 2 },
        ],
      },
      b: {
        say: 'Thank you. You are learning. Soon you will be a big business person too.',
        opts: [{ say: 'Thanks, coach.', pts: 1 }, { say: 'Maybe.' }],
      },
      c: {
        say: 'My real name is... no. A blob must keep some mystery. It is very long, and Oyijon is the only one who says it right.',
        mood: 'worry',
        opts: [{ say: 'Fair enough.', pts: 1 }, { say: "Someday you'll tell me." }],
      },
    },
  },
  {
    id: 'visitors',
    lvl: 2,
    nodes: {
      a: {
        say: 'More people come to the island lately. Every one is a potential customer. And a potential friend. Mostly customers.',
        opts: [
          { say: 'Mostly customers?', to: 'b' },
          { say: "I'll bring my friends by.", pts: 1, to: 'b' },
        ],
      },
      b: {
        say: 'Okay. Mostly friends. Do not tell my business book.',
        mood: 'joy',
        opts: [{ say: 'Your secret is safe.', pts: 2 }, { say: 'Ha!' }],
      },
    },
  },
  {
    id: 'rides',
    lvl: 0,
    needs: 'kicked',
    nodes: {
      a: {
        say: 'Are you here for a ride? Because no. The back is closed.',
        mood: 'grump',
        opts: [
          { say: 'I just came to say hi.', to: 'b', pts: 1 },
          { say: 'Not even a short one?', to: 'c' },
        ],
      },
      b: {
        say: 'Oh. Hi, then. Hello. That is nice.',
        mood: 'joy',
        opts: [{ say: 'Hi, Boogler.', pts: 1 }, { say: 'Okay, bye, Boogler.' }],
      },
      c: {
        say: 'No! Short rides become long rides. Long rides become... launches.',
        mood: 'grump',
        opts: [{ say: 'Okay, okay.' }, { say: 'The launches are kind of fun.', to: 'd' }],
      },
      d: {
        say: 'For you! For me it is like sneezing with my whole body.',
        opts: [
          { say: 'Sorry.', pts: 1 },
          { say: 'Bless you.', pts: 1 },
        ],
      },
    },
  },
];

export const GREETINGS = [
  [
    'Oh! Hello. Assalomu alaykum. You are a person. I am The Boogler.',
    'Hello, stranger. Do you need something? I am very busy. Walking around.',
  ],
  ['Ah, it is you! Assalomu alaykum!', 'Oh, hello again! Nice to see a familiar face.'],
  ["{name}! Assalomu alaykum, do'stim! That means 'my friend'.", '{name}! My pal! What is new?'],
  ['{name}! There you are. I saved you a spot in my day.', "Do'stim! Come, come. Talk to me."],
  ['{name}! My favorite person on this whole island. Do not tell the others.', 'There is my {name}! Stand, talk.'],
  ['{name}! My best friend and future business partner!', "Do'stim! Every day is better when you show up."],
];
export const AFTER = ['What else?', 'Anything else on your mind?', 'Mm. What else, {name}?'];
export const BYE = ['Bye, Boogler!', 'See you later!', "I'd better go."];
export const BYE_OPTS = ['Xayr!', 'See you soon!'];
export const FAREWELL = [
  "Xayr! That means 'goodbye'.",
  'Xayr, {name}!',
  'Xayr, {name}! Come back soon.',
  "Ko'rishguncha, {name}!",
  "Ko'rishguncha, {name}! Do not stay away long.",
  "Ko'rishguncha, partner!",
];
export const DEFLECT_OPTS = ['Fair enough.', 'Oh, come on, tell me!'];
export const PUSHED = ['You are very nosy, you know that?', 'Hmph. Patience is a business skill, you know.'];
export const PUSHED_OPTS = ['Sorry.', 'Fine, fine.'];
export const RETELL_OPTS = ['Ha! Okay.', 'Sounds good.'];
export const TOO_NOSY = 'Too many questions! I need some me-time. Come back later.';
export const QUIET = ['Not now. I am having a think.', 'Mm-mm. No talking right now. I am recharging.'];
export const QUIET_OPTS = ['Okay. Sorry, Boogler.', "I'll come back later."];

export const KICK = [
  'Hey! No free rides!',
  'Again?! I am a Boogler, not a bus!',
  'That is it! I am keeping my distance from you!',
];
export const KICK_MORE = [
  'What did I JUST say?!',
  'Rides cost money. You do not have money.',
  'Off! The Boogler is not a pony!',
  'This back is closed for business!',
];
export const KICK_OPTS = [
  {
    say: 'Sorry, Boogler!',
    pts: 1,
    reply: 'Hmph. Apology... noted.',
    wary: 'Sorry is a start. Bring me a present and maybe I will stop running.',
  },
  { say: "But you're so comfy!", reply: 'Comfy is not free!', wary: 'Comfy is CLOSED.' },
  { say: 'Wheee! Again!', pts: -2, reply: 'NO. Not again.', wary: 'Never again!' },
];
export const KICK_DONE = ['Fine.', 'Okay, okay.'];

export const WARY = ['Stay back! I know what you want. A ride.', 'You again! My back is not available.'];
export const SORRY = "I'm really sorry about the rides.";
export const SORRY_YES = '...Okay. I accept a little bit of the sorry. Keep it up.';
export const SORRY_NO = 'You already said sorry. Sorry is not a present.';
export const SORRY_OPTS = ['Okay.', 'Fair enough.'];

export const GIFT_ASK = 'I brought you something.';
export const GIFT_PROMPT = 'A present? For me? What is it?';
export const GIFT_NONE = 'Never mind.';
export const GIFT_FORGAVE = '...Fine. You are forgiven. Mostly.';
export const GIFT_CAPPED = 'So many presents today! I will keep it, but you are spoiling me.';
export const GIFT_REPEAT = 'Another one! You really like giving me these.';
export const GIFT_OPTS = {
  love: ["I knew you'd love it!", 'Anything for you, Boogler.'],
  like: ['Glad you like it!', "You're welcome!"],
  meh: ["It's the thought that counts.", "Sorry, it's all I had."],
  dislike: ['Oops. Sorry!', "I thought you'd find it funny."],
};

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
