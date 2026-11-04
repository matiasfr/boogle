// Everything The Boogler says. Pure data, read by src/boogler/talk.ts.
// A chapter is a tree starting at `a`. Options hold { say, to?, set? }; no `to` ends the chapter.
// `set` stores remembered flags ({slogan}, {idea} in later lines read them).
// Moods: smile (default), joy, grump, worry. {name} is the player's name.

export const THREADS = {
  home: {
    ask: ['Where are you from?', 'Tell me more about home.', 'Tell me about Samarqand again.'],

    retell: [
      'Did I tell you about the melons? Seven hundred. I still dream about them.',
      'Samarqand. Blue domes, best bread. I could talk about it all day. I basically have.',
    ],
    chapters: [
      {
        id: 'home0',

        nodes: {
          a: {
            say: 'Me? Uzbekistan! Right in the middle of everything, and very far from the sea. The sea is very new to me.',
            mood: 'joy',
            opts: [
              { say: "Uzbekistan! That's far away.", to: 'b' },
              { say: 'Never heard of it.', to: 'c' },
              { say: 'How did you end up on an island, then?', to: 'd2' },
            ],
          },
          b: {
            say: 'Very far. I grew up near Samarqand. Blue domes, very old, and the best bread in the world. You should visit. Bring a big bag for the bread.',
            opts: [
              { say: 'Blue domes? That sounds beautiful.' },
              { say: "I'll bring two bags." },
              { say: 'Bread is bread.', to: 'e' },
            ],
          },
          c: {
            say: 'Never heard of... Hmph. It is a whole country! Mountains, deserts, melons as big as me. It is okay. Now you have heard of it.',
            mood: 'grump',
            opts: [{ say: 'Melons as big as you?', to: 'f' }, { say: 'Cool, I guess.' }],
          },

          d2: {
            say: 'A boat, a storm, and a lot of melons. I will tell you properly one day. With snacks.',
            opts: [{ say: "I'll bring the snacks." }, { say: 'Melons?!' }],
          },
          e: {
            say: 'Bread is NOT bread! Our non is round like the sun, stamped with patterns, baked on the wall of a clay oven. You will see. One day.',
            mood: 'grump',
            opts: [{ say: 'Okay, okay, I believe you.' }, { say: 'Sorry, Boogler.' }],
          },
          f: {
            say: 'Bigger! Golden ones, sweet like honey. At the bazaar they stack them up like cannonballs. I miss them very much.',
            mood: 'joy',
            opts: [{ say: 'I hope you get one again someday.' }, { say: "I'll keep an eye out for melons." }],
          },
        },
      },
      {
        id: 'home1',

        nodes: {
          a: {
            say: 'Samarqand has a square called the Registon. Three huge buildings covered in blue tiles. When the sun hits them they glow, like this sea at noon.',
            mood: 'joy',
            opts: [
              { say: 'That sounds amazing.', to: 'b' },
              { say: 'Bluer than this sea?', to: 'c' },
              { say: 'Do you have pictures?', to: 'd' },
            ],
          },
          b: {
            say: 'It is! And near it, the big bazaar. Spices, dried fruit, bread stacked to the ceiling, everybody shouting prices. That is where I learned business.',
            opts: [
              { say: 'You learned business at a bazaar?', to: 'e' },
              { say: 'Sounds loud.', to: 'f' },
              { say: "I'd love to see it." },
            ],
          },
          c: {
            say: 'Hmm. Same blue, maybe. But the Registon does not get in your mouth when you yawn.',
            opts: [
              { say: 'Ha! Fair point.', to: 'b' },
              { say: "The sea's not that bad.", to: 'b' },
            ],
          },
          d: {
            say: 'I had a phone. Now it is a home for a small fish. So I keep the pictures up here instead. In my head. Somewhere in the middle.',
            mood: 'worry',
            opts: [
              { say: "That's the best place for them.", to: 'b' },
              { say: 'Rest in peace, phone.', to: 'b' },
            ],
          },
          e: {
            say: 'Oh yes. At the bazaar you never pay the first price. You smile, you shake your head, you walk away slowly... and they call you back. Very important skill.',
            mood: 'joy',
            opts: [
              { say: 'Teach me sometime!' },
              { say: 'So that explains the charm.' },
              { say: 'That sounds exhausting.' },
            ],
          },
          f: {
            say: 'Loud is good! Loud means business is happening. Here it is only the waves, and the waves never buy anything.',
            mood: 'grump',
            opts: [{ say: "I'll buy something someday." }, { say: 'The waves seem nice, though.' }],
          },
        },
      },
      {
        id: 'home2',

        nodes: {
          a: {
            say: 'Do you know what I miss most? Osh. You call it plov. Rice, yellow carrots, lamb, all cooked together in a big iron pot called a qozon.',
            mood: 'joy',
            opts: [
              { say: 'That sounds delicious.', to: 'b' },
              { say: "What's the secret?", to: 'c' },
              { say: 'You eat lamb?', to: 'd' },
            ],
          },
          b: {
            say: 'Delicious is too small a word. A good osh is a party. People come from three streets away when they smell it.',
            opts: [
              { say: 'I want to try it someday.', to: 'e' },
              { say: 'Can you make it here?', to: 'e' },
            ],
          },
          c: {
            say: 'Patience. And the right carrots. And never, ever stirring it when Oyijon says do not stir it.',
            opts: [
              { say: "Who's Oyijon?", to: 'f', set: { mom: 1 } },
              { say: 'Noted. No stirring.', to: 'e' },
            ],
          },
          d: {
            say: 'Lamb, yes. Not blobs! Do not worry, nobody eats blobs. I asked.',
            mood: 'worry',
            opts: [
              { say: 'Good to know!', to: 'e' },
              { say: '...Why did you have to ask?', to: 'e' },
            ],
          },
          e: {
            say: 'Here there is no rice, no carrots, no qozon. Only coconuts. I tried coconut osh once. I do not want to talk about coconut osh.',
            mood: 'grump',
            opts: [{ say: 'Was it that bad?', to: 'g' }, { say: "I'll find you some carrots." }],
          },
          f: {
            say: "My mother! Oyijon means something like 'mommy dear'. She makes the best osh in the whole region. She would tell you herself. Loudly.",
            mood: 'joy',
            opts: [{ say: 'She sounds great.' }, { say: 'Tell me everything about her!' }],
          },
          g: {
            say: 'It was a crime. The coconut was very confused. I was very confused. We do not speak of it.',
            mood: 'grump',
            opts: [{ say: 'A moment of silence.' }, { say: 'Ha! Okay.' }],
          },
        },
      },
      {
        id: 'home3',

        nodes: {
          a: {
            say: 'You want to know how I got here? Okay. You are my friend now, so I will tell you the truth. It was melons.',
            opts: [
              { say: 'Melons?', to: 'b' },
              { say: 'I knew it.', to: 'b' },
              { say: 'Is this a sad story?', to: 'b' },
            ],
          },
          b: {
            say: 'Uzbekistan is doubly landlocked. To reach any sea, you cross two whole countries. I did not know this when I started a melon export business.',
            opts: [
              { say: 'Oh no.', to: 'c' },
              { say: 'That seems like a big thing to miss.', to: 'c' },
              { say: "That's actually kind of brave.", to: 'c' },
            ],
          },
          c: {
            say: 'Four trucks, two trains, one very small boat, and seven hundred golden melons. Then a storm. The boat went one way. The melons went every way. I went... here.',
            mood: 'worry',
            opts: [
              { say: 'Are you okay?', to: 'd' },
              { say: 'What happened to the melons?', to: 'e' },
              { say: 'At least you float!', to: 'f' },
            ],
          },
          d: {
            say: 'I am okay now. Blobs float. That is the one good thing about being a blob. I held on to one melon the whole way.',
            opts: [{ say: 'What happened to that melon?', to: 'e' }, { say: "I'm glad you made it." }],
          },
          e: {
            say: 'I ate it. On the first night. It was the best melon of my life. Then I had zero melons, and a business with zero products.',
            mood: 'grump',
            opts: [
              { say: "That's rough, buddy." },
              { say: "Honestly, I'd have eaten it too." },
              { say: 'Seven hundred melons... wow.' },
            ],
          },
          f: {
            say: 'I do float! Very well. I floated for three days. I would rather not float again, thank you.',
            mood: 'grump',
            opts: [
              { say: 'Sorry, that was a joke.', to: 'd' },
              { say: 'Three days?!', to: 'd' },
            ],
          },
        },
      },
      {
        id: 'home4',

        nodes: {
          a: {
            say: "Every spring at home we have Navro'z, the new year. Everybody cleans, everybody cooks, and the apricot tree in our courtyard explodes with flowers.",
            mood: 'joy',
            opts: [
              { say: 'An apricot tree in your yard?', to: 'b' },
              { say: 'What do you cook?', to: 'c' },
              { say: 'That sounds really lovely.', to: 'b' },
            ],
          },
          b: {
            say: 'Right in the middle of the courtyard. Oyijon planted it the year I was born. I used to sit under it and count apricots. Business practice.',
            opts: [
              { say: 'Counting apricots as a kid. Of course.', to: 'd' },
              { say: 'Do you think it is still there?', to: 'd' },
            ],
          },
          c: {
            say: 'Sumalak! Wheat sprouts cooked all night in a giant pot. Everyone takes turns stirring and singing. It is sweet and brown and it takes forever.',
            opts: [
              { say: 'All night?!', to: 'b' },
              { say: 'I want a turn stirring!', to: 'b' },
            ],
          },
          d: {
            say: 'It is still there. I imagine it, anyway. Getting tall. Dropping apricots on the roof. Waiting for me to come and count them.',
            mood: 'worry',
            opts: [{ say: "It'll be there when you get back." }, { say: "You'll go back someday." }],
          },
        },
      },
      {
        id: 'home5',

        nodes: {
          a: {
            say: '{name}, can I tell you something? When I washed up here I thought, this is not home. No bazaar, no osh, no Oyijon.',
            mood: 'worry',
            opts: [
              { say: 'And now?', to: 'b' },
              { say: "I'm sorry, Boogler.", to: 'b' },
            ],
          },
          b: {
            say: 'Now... there is a ball that hits me in the head. There are mushrooms that bounce. There is you. It is not home. But it is not nothing.',
            mood: 'joy',
            opts: [
              { say: "It's not nothing to me either.", to: 'c' },
              { say: 'The ball says sorry about your head.', to: 'c' },
            ],
          },
          c: {
            say: "At home, for goodbye you can say 'xayr'. But I like 'ko'rishguncha' better. It means 'until we see each other again'. It is a promise. Ko'rishguncha, {name}.",
            mood: 'joy',
            opts: [{ say: "Ko'rishguncha, Boogler." }, { say: "That's really nice." }],
          },
        },
      },
    ],
  },

  mom: {
    ask: ['Do you have any family?', "How's your mom?", 'Tell me about Oyijon again.'],

    retell: [
      'Oyijon would like you. She would feed you until you could not move.',
      'I wrote her about you again. You are my most popular topic.',
    ],
    chapters: [
      {
        id: 'mom0',

        nodes: {
          a: {
            say: 'Family? I have Oyijon. My mother. She is small and loud and she can carry four melons at once.',
            mood: 'joy',
            opts: [
              { say: 'Four melons?!', to: 'b' },
              { say: 'She sounds wonderful.', to: 'c', set: { mom: 1 } },
              { say: 'What about your dad?', to: 'd' },
            ],
          },
          b: {
            say: 'Four! Two in her arms, one under her chin, and the fourth... I never figured out where the fourth one goes. That is her secret.',
            opts: [
              { say: 'She sounds like a legend.', to: 'c', set: { mom: 1 } },
              { say: 'I need to meet her.', to: 'c', set: { mom: 1 } },
            ],
          },
          c: {
            say: "She calls me 'bolam'. My child. Even now. Even though I am this big and very round.",
            opts: [{ say: "That's sweet." }, { say: 'You must miss her.', to: 'e' }],
          },
          d: {
            say: 'That is... a little personal. We are not there yet, I think.',
            mood: 'worry',
            opts: [
              { say: "Sorry, I didn't mean to pry.", to: 'c' },
              { say: 'Okay.', to: 'c' },
            ],
          },
          e: {
            say: 'Every day. But it is okay. I will see her again. Probably. Hopefully. Let us talk about something else.',
            mood: 'worry',
            opts: [{ say: "I'm sure you will." }, { say: 'Sure thing.' }],
          },
        },
      },
      {
        id: 'mom1',

        nodes: {
          a: {
            say: 'Oyijon has one rule. If you walk into her house, you eat. Not hungry? You eat. You just ate? You eat again.',
            mood: 'joy',
            opts: [
              { say: 'My kind of rule.', to: 'b' },
              { say: 'What if you say no?', to: 'c' },
              { say: 'Is that where you got so... round?', to: 'd' },
            ],
          },
          b: {
            say: "Bread, tea, osh, apricots, more bread. She watches you eat and says 'bolam, why so thin?' She says it to me. Look at me!",
            opts: [
              { say: 'Even to YOU?', to: 'e' },
              { say: 'I miss home cooking too.', to: 'e' },
            ],
          },
          c: {
            say: 'Nobody says no to Oyijon. People have tried. They are still eating.',
            opts: [
              { say: 'Ha!', to: 'b' },
              { say: 'Terrifying.', to: 'b' },
            ],
          },
          d: {
            say: 'Rude! ...Yes. Absolutely yes.',
            mood: 'grump',
            opts: [
              { say: 'Sorry! Kidding!', to: 'b' },
              { say: 'It suits you.', to: 'b' },
            ],
          },
          e: {
            say: "Here I eat coconuts, and nobody watches, and nobody says 'eat more'. It is quiet. Too quiet.",
            mood: 'worry',
            opts: [
              { say: 'Eat more, Boogler.' },
              { say: "I'll bring you better food." },
              { say: "You've got me now." },
            ],
          },
        },
      },
      {
        id: 'mom2',

        nodes: {
          a: {
            say: 'You wonder why I do not just go and see Oyijon. There are no boats here. And even if there were... I made her a promise.',
            opts: [
              { say: 'What promise?', to: 'b' },
              { say: 'No boats at all?', to: 'c' },
              { say: "You don't have to tell me.", to: 'b' },
            ],
          },
          b: {
            say: "When I left with the melons I said, 'Oyijon, I will come back a big success.' She laughed and said, 'Come back fed.' But I promised the first thing.",
            opts: [
              { say: 'She just wants you back.', to: 'd' },
              { say: "So you won't go home until you're a success?", to: 'd' },
              { say: "That's a lot of pressure.", to: 'd' },
            ],
          },
          c: {
            say: 'I asked a seagull. The seagull did not answer. I think that means no.',
            opts: [
              { say: 'Could you build a raft?', to: 'e' },
              { say: 'Seagulls are bad at directions.', to: 'b' },
            ],
          },
          d: {
            say: "I want to stand in her kitchen and say, 'Oyijon, I did it.' Not, 'Oyijon, I lost seven hundred melons and floated away.'",
            mood: 'worry',
            opts: [
              { say: "She'd be proud either way." },
              { say: "Then let's make you a success." },
              { say: 'The melon story is pretty good, though.' },
            ],
          },
          e: {
            say: 'I tried! I built a raft out of palm leaves. It turned into a hat. A nice hat. But not a boat.',
            opts: [
              { say: 'A hat is something!', to: 'b' },
              { say: 'Better luck next time.', to: 'b' },
            ],
          },
        },
      },
      {
        id: 'mom3',

        nodes: {
          a: {
            say: 'Can I tell you a secret? Every week I write Oyijon a letter, put it in a coconut shell, and throw it into the sea.',
            opts: [
              { say: 'A coconut shell?', to: 'b' },
              { say: 'Has she ever written back?', to: 'c' },
              { say: "That's really sweet.", to: 'b' },
            ],
          },
          b: {
            say: 'There are no bottles. Only coconuts. Coconuts are a terrible postal service. Most of them come back.',
            mood: 'grump',
            opts: [
              { say: 'What do you write?', to: 'd' },
              { say: 'Keep throwing. One will get there.', to: 'd' },
            ],
          },
          c: {
            say: 'Not yet. The sea is very big and her address is very small. But she is patient. She ran a stall at the bazaar for thirty years. Patience is her whole business.',
            opts: [
              { say: 'She ran a stall?', to: 'e' },
              { say: 'Sounds like you get it from her.', to: 'e' },
            ],
          },
          d: {
            say: 'I tell her I am eating. That is not a lie. Coconuts count. And I tell her about the island, and the mushrooms, and lately... about you.',
            mood: 'joy',
            opts: [{ say: 'About me?', to: 'f' }, { say: 'Tell her I said hi.' }],
          },
          e: {
            say: 'She sells suzani. Big embroidered cloths, with flowers and pomegranates stitched all over them. She is the real business person. I am trying to catch up.',
            opts: [{ say: "You'll catch up." }, { say: "So that's where you got it." }],
          },
          f: {
            say: "I wrote, 'There is somebody here named {name} who is very nice and brings me presents.' She will be so happy. She worries I have no friends.",
            mood: 'joy',
            opts: [{ say: 'You have a friend.' }, { say: 'Aww, Boogler.' }],
          },
        },
      },
      {
        id: 'mom4',

        nodes: {
          a: {
            say: '{name}, I am writing another letter to Oyijon. Will you help me? I never know how to start.',
            opts: [
              { say: 'Of course!', to: 'b' },
              { say: "Start with 'I miss you'.", to: 'c' },
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
              { say: 'Going is very good.', to: 'f' },
              { say: 'Tell her about your friend too.', to: 'e' },
            ],
          },
          e: {
            say: "'I have a best friend here called {name}. They pat my head and bring me presents and sometimes jump on me, but I forgive them.'",
            mood: 'joy',
            opts: [
              { say: "I'm honored.", to: 'f' },
              { say: 'Sorry about the jumping.', to: 'f' },
            ],
          },
          f: {
            say: "'Love, your bolam. P.S. Eat something.' There. She always says that to me, so I say it back.",
            mood: 'joy',
            opts: [{ say: "She'll love it." }, { say: 'Throw it really far.' }],
          },
        },
      },
    ],
  },

  biz: {
    ask: ['What do you do here?', "How's business?", 'How is the Emporium going?'],

    retell: [
      'The Emporium is in the planning phase. A long planning phase. The best kind.',
      "The slogan is still '{slogan}'. Still perfect.",
    ],
    chapters: [
      {
        id: 'biz0',

        nodes: {
          a: {
            say: 'What do I do? I am an entrepreneur! Between ventures. Currently my venture is walking around.',
            mood: 'joy',
            opts: [
              { say: 'An entrepreneur?', to: 'b' },
              { say: 'Walking around is a great venture.', to: 'c' },
              { say: "So you're unemployed.", to: 'd' },
            ],
          },
          b: {
            say: 'Yes! I start businesses. Have you seen that seed stall? Free seeds! No price! Who runs a stall like that? It hurts me to look at it.',
            mood: 'grump',
            opts: [
              { say: 'Free stuff is nice, though.', to: 'e' },
              { say: 'You could run it better.', to: 'f' },
            ],
          },
          c: {
            say: 'Thank you! Low costs. Good exercise. Zero profit, but you cannot have everything.',
            opts: [{ say: 'What else have you tried?', to: 'b' }, { say: 'Ha!' }],
          },
          d: {
            say: 'Between ventures! It is different! ...It is a little bit the same.',
            mood: 'grump',
            opts: [
              { say: 'Sorry. Between ventures.', to: 'b' },
              { say: 'Hey, me too.', to: 'b' },
            ],
          },
          e: {
            say: 'Nice for customers. Terrible for business. Someday I will have my own stall, with prices, and a sign, and a little bell.',
            mood: 'joy',
            opts: [{ say: "I'd shop there." }, { say: 'What would you sell?', to: 'f' }],
          },
          f: {
            say: 'I do not know yet! That is the exciting part. Something people want. You bring me ideas, and I bring the... enthusiasm.',
            opts: [{ say: 'Deal.' }, { say: "I'll think about it." }],
          },
        },
      },
      {
        id: 'biz1',

        nodes: {
          a: {
            say: 'Business is a journey. Since I washed up, I have started three businesses. Would you like to hear my portfolio?',
            opts: [
              { say: 'Absolutely.', to: 'b' },
              { say: 'Do I have a choice?', to: 'b' },
            ],
          },
          b: {
            say: 'One: a coconut water stand. Great product, zero customers. Nobody else was on the island. Two: seashell consulting. I told the shells where to sit. They did not listen.',
            opts: [
              { say: 'And the third?', to: 'c' },
              { say: 'Those sound... ambitious.', to: 'c' },
            ],
          },
          c: {
            say: 'Three: professional napping. I am very good at it. But nobody pays you to nap. I checked.',
            mood: 'grump',
            opts: [
              { say: 'Maybe you were ahead of your time.', to: 'd' },
              { say: 'You should charge for naps.', to: 'd' },
              { say: 'So, three failures.', to: 'e' },
            ],
          },
          d: {
            say: 'That is what I said! The market was not ready. But now people come to the island. People mean customers. My time is coming.',
            mood: 'joy',
            opts: [{ say: 'Your time is definitely coming.' }, { say: "I'm a person. Am I a customer?", to: 'f' }],
          },
          e: {
            say: "Three learning experiences! Failure is just a business word for 'not yet'.",
            mood: 'grump',
            opts: [
              { say: 'Okay. Not yet.', to: 'd' },
              { say: 'Fair.', to: 'd' },
            ],
          },
          f: {
            say: 'You are my first customer and my first focus group. Congratulations. There is no prize.',
            opts: [{ say: 'Best day ever.' }, { say: 'Aw, no prize?' }],
          },
        },
      },
      {
        id: 'biz2',

        nodes: {
          a: {
            say: "Big news. A book washed up. 'Business for Beginners.' Most of the pages are stuck together, but I have read chapter one ten times.",
            mood: 'joy',
            opts: [
              { say: "What's chapter one?", to: 'b' },
              { say: 'Ten times?', to: 'b' },
              { say: 'Read me some!', to: 'b' },
            ],
          },
          b: {
            say: "'Know your customer.' So I am studying you. What do you like? What do you need? What makes you open your wallet? You do not have a wallet. Hmm.",
            opts: [
              { say: 'I like the beach ball.', to: 'd' },
              { say: 'I like hanging out with you.', to: 'e' },
            ],
          },
          d: {
            say: 'The ball! Everyone loves the ball. It hits me sometimes. I could charge for that. One coin per bonk. Write that down.',
            opts: [
              { say: 'Ball insurance!', to: 'f', set: { idea: 'ball insurance' } },
              { say: "Please don't charge for the ball.", to: 'f' },
            ],
          },
          e: {
            say: 'Oh. That is not a business answer. But it is a good answer. Chapter two is probably about friends. The pages are stuck, so I will assume it.',
            mood: 'joy',
            opts: [
              { say: 'Chapter two: be nice.', to: 'f' },
              { say: 'Ha, sure.', to: 'f' },
            ],
          },
          f: {
            say: 'This is good research. You are an excellent focus group, {name}.',
            opts: [{ say: 'Happy to help!' }, { say: 'Do focus groups get paid?', to: 'g' }],
          },
          g: {
            say: 'In exposure. When I am rich, you will be famous for knowing me. Very good deal for you.',
            opts: [{ say: "Can't argue with that." }, { say: 'Hmm.' }],
          },
        },
      },
      {
        id: 'biz3',

        nodes: {
          a: {
            say: "{name}, I have decided. I am opening a restaurant. 'The Boogler's Osh and Coconut Emporium.' Osh, like at home, but made with island things.",
            mood: 'joy',
            opts: [
              { say: 'The Emporium! I love it.', to: 'b' },
              { say: "Didn't you say coconut osh was a crime?", to: 'c' },
              { say: 'Where will you get rice?', to: 'd' },
            ],
          },
          b: {
            say: 'Thank you! Every business needs a slogan. Help me pick one. This is very important for the brand.',
            opts: [
              { say: "'Come hungry, leave round.'", to: 'e', set: { slogan: 'Come hungry, leave round.' } },
              { say: "'Rice to meet you.'", to: 'e', set: { slogan: 'Rice to meet you.' } },
              { say: "'No free rides.'", to: 'e', set: { slogan: 'No free rides.' } },
            ],
          },
          c: {
            say: 'It was a crime then. Now it is a recipe in development. That is what we call it in business.',
            mood: 'grump',
            opts: [
              { say: 'Recipe in development. Got it.', to: 'b' },
              { say: 'If you say so.', to: 'b' },
            ],
          },
          d: {
            say: 'Ah. Problem one. No rice. I will start with chopped mushroom. It looks like rice if you squint, and if you are very hungry.',
            opts: [
              { say: 'Squinting is free.', to: 'b' },
              { say: 'Bold choice.', to: 'b' },
            ],
          },
          e: {
            say: "'{slogan}' ...Yes. YES. I will paint it on a big sign. When I have paint. And a sign.",
            mood: 'joy',
            opts: [{ say: "You'll get there." }, { say: "I'll find you driftwood for the sign." }],
          },
        },
      },
      {
        id: 'biz4',

        nodes: {
          a: {
            say: 'Can I be honest? Sometimes at night I look at the waves and think: what if I am not a business person? What if I am just a blob who lost some melons?',
            mood: 'worry',
            opts: [
              { say: "You're not just a blob.", to: 'b' },
              { say: 'Everyone has doubts.', to: 'c' },
              { say: 'What would Oyijon say?', to: 'd' },
            ],
          },
          b: {
            say: 'No? Then what am I?',
            opts: [
              { say: "You're a blob with a plan.", to: 'e' },
              { say: "You're my friend.", to: 'e' },
              { say: "You're THE Boogler.", to: 'f' },
            ],
          },
          c: {
            say: 'Even you? You always seem so sure. You walk right up to strangers and pat them on the head.',
            opts: [
              { say: 'Even me.', to: 'e' },
              { say: 'Patting heads is easy. Business is hard.', to: 'e' },
            ],
          },
          d: {
            say: "She would say, 'Bolam, you lost melons, not your head. Go try again. And eat something.'",
            mood: 'joy',
            opts: [
              { say: 'Smart woman.', to: 'e' },
              { say: 'So try again!', to: 'e' },
            ],
          },
          e: {
            say: 'Okay. Okay! Melons: gone. Emporium: coming. Doubts... we will give them a small table in the back.',
            mood: 'joy',
            opts: [{ say: "That's the spirit!" }, { say: 'Way to go, Boogler.' }],
          },
          f: {
            say: "With a 'The'! A good brand always has a 'The'. You are right. I am THE Boogler!",
            mood: 'joy',
            opts: [{ say: 'THE Boogler!' }, { say: 'Exactly.' }],
          },
        },
      },
      {
        id: 'biz5',

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
              { say: "Partners? I'd love that.", to: 'd' },
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
            opts: [{ say: "I'll bring a big appetite." }, { say: 'Partners, Boogler.' }],
          },
          e: {
            say: 'I will figure out the last part later. Rivers? Trucks? A very long rope? Details. Every great plan has details.',
            mood: 'worry',
            opts: [
              { say: "I'll help with the details.", to: 'd' },
              { say: 'A long rope, obviously.', to: 'd' },
            ],
          },
          f: {
            say: 'Partners share the work, the profit and the coconuts. Mostly the coconuts, at first. Also your name goes on the sign.',
            opts: [
              { say: 'Sign me up.', to: 'd' },
              { say: "I'm in.", to: 'd' },
            ],
          },
        },
      },
    ],
  },
};

// Small talk for "How's it going?". `needs` names a remembered flag that must be set.
export const SMALL_TALK = [
  {
    id: 'ball',

    nodes: {
      a: {
        say: 'That beach ball hit me in the head again today. I do not mind. Okay, I mind a little.',
        opts: [{ say: 'Sorry, that might have been me.' }, { say: "It's a very good ball." }],
      },
    },
  },
  {
    id: 'mushrooms',

    nodes: {
      a: {
        say: 'Have you seen the mushrooms from the stall? One bag of seeds, and pop! Five trampolines. Amazing product. Terrible pricing.',
        opts: [
          { say: 'Terrible pricing?', to: 'b' },
          { say: "They're super fun.", to: 'b' },
        ],
      },
      b: {
        say: 'Free! Again! If I ran that stall, every bounce would cost a coin. Okay, half a coin. Okay, a smile. ...Fine. Free.',
        opts: [{ say: "You're a softie." }, { say: 'Free is good, Boogler.' }],
      },
    },
  },
  {
    id: 'name',

    nodes: {
      a: {
        say: "Do you know why I am THE Boogler? Not just Boogler? A good brand needs a 'The'.",
        opts: [
          { say: 'Very smart.', to: 'b' },
          { say: "What's your real name?", to: 'c' },
        ],
      },
      b: {
        say: 'Thank you. You are learning. Soon you will be a big business person too.',
        opts: [{ say: 'Thanks, coach.' }, { say: 'Maybe.' }],
      },
      c: {
        say: 'My real name is... no. A blob must keep some mystery. It is very long, and Oyijon is the only one who says it right.',
        mood: 'worry',
        opts: [{ say: 'Fair enough.' }, { say: "Someday you'll tell me." }],
      },
    },
  },
  {
    id: 'visitors',

    nodes: {
      a: {
        say: 'More people come to the island lately. Every one is a potential customer. And a potential friend. Mostly customers.',
        opts: [
          { say: 'Mostly customers?', to: 'b' },
          { say: "I'll bring my friends by.", to: 'b' },
        ],
      },
      b: {
        say: 'Okay. Mostly friends. Do not tell my business book.',
        mood: 'joy',
        opts: [{ say: 'Your secret is safe.' }, { say: 'Ha!' }],
      },
    },
  },
  {
    id: 'rides',

    needs: 'kicked',
    nodes: {
      a: {
        say: 'Are you here for a ride? Because no. The back is closed.',
        mood: 'grump',
        opts: [
          { say: 'I just came to say hi.', to: 'b' },
          { say: 'Not even a short one?', to: 'c' },
        ],
      },
      b: {
        say: 'Oh. Hi, then. Hello. That is nice.',
        mood: 'joy',
        opts: [{ say: 'Hi, Boogler.' }, { say: 'Okay, bye, Boogler.' }],
      },
      c: {
        say: 'No! Short rides become long rides. Long rides become... launches.',
        mood: 'grump',
        opts: [{ say: 'Okay, okay.' }, { say: 'The launches are kind of fun.', to: 'd' }],
      },
      d: {
        say: 'For you! For me it is like sneezing with my whole body.',
        opts: [{ say: 'Sorry.' }, { say: 'Bless you.' }],
      },
    },
  },
];

export const GREETINGS = {
  first: [
    'Oh! Hello. Assalomu alaykum. You are a person. I am The Boogler.',
    'Hello, stranger. Do you need something? I am very busy. Walking around.',
  ],
  again: [
    'Ah, it is you! Assalomu alaykum!',
    'Oh, hello again! Nice to see a familiar face.',
    "{name}! Assalomu alaykum, do'stim! That means 'my friend'.",
    '{name}! My pal! What is new?',
    '{name}! There you are. I saved you a spot in my day.',
    "Do'stim! Come, come. Talk to me.",
    '{name}! My favorite person on this whole island. Do not tell the others.',
    'There is my {name}! Stand, talk.',
    '{name}! My best friend and future business partner!',
    "Do'stim! Every day is better when you show up.",
  ],
};
export const AFTER = ['What else?', 'Anything else on your mind?', 'Mm. What else, {name}?'];
export const BYE = ['Bye, Boogler!', 'See you later!', "I'd better go."];
export const FAREWELL = {
  first: "Xayr! That means 'goodbye'.",
  again: [
    'Xayr, {name}!',
    'Xayr, {name}! Come back soon.',
    "Ko'rishguncha, {name}!",
    "Ko'rishguncha, {name}! Do not stay away long.",
    "Ko'rishguncha, partner!",
  ],
};

export const RETELL_OPTS = ['Ha! Okay.', 'Sounds good.'];

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

    reply: 'Hmph. Apology... noted.',
    wary: 'Sorry is a start. Bring me a present and maybe I will stop running.',
  },
  { say: "But you're so comfy!", reply: 'Comfy is not free!', wary: 'Comfy is CLOSED.' },
  { say: 'Wheee! Again!', reply: 'NO. Not again.', wary: 'Never again!' },
];
export const KICK_DONE = ['Fine.', 'Okay, okay.'];

export const WARY = ['Stay back! I know what you want. A ride.', 'You again! My back is not available.'];
export const SORRY = "I'm really sorry about the rides.";
export const SORRY_YES = '...Okay. I accept a little bit of the sorry. Keep it up.';
export const SORRY_NO = 'You already said sorry. Sorry is not a present.';
export const SORRY_OPTS = ['Okay.', 'Fair enough.'];

// Picking a chapter back up where you walked off last time; it goes before the line he stopped at.
export const RESUME = ['Now, where was I? Ah, yes.', 'As I was saying, before you ran off...'];

export const GIFT_ASK = 'I brought you {gift}.';
export const GIFT_KEPT_OPTS = ['Fair enough.', 'Worth a try.'];
export const GIFT_FORGAVE = '...Fine. You are forgiven. Mostly.';
export const GIFT_CAPPED = 'So many presents today! I will keep it, but you are spoiling me.';
export const GIFT_REPEAT = 'Another one! You really like giving me these.';
export const GIFT_OPTS = {
  love: ["I knew you'd love it!", 'Anything for you, Boogler.'],
  like: ['Glad you like it!', "You're welcome!"],
  meh: ["It's the thought that counts.", "Sorry, it's all I had."],
  dislike: ['Oops. Sorry!', "I thought you'd find it funny."],
};

// Talking to him as Mario: he is starstruck and nervous, and Mario only answers in Mario. Every answer comes from
// MARIO_SAYS. Unscored, and he forgets he was cross with you.
export const MARIO_SAYS = [
  "It's-a me, Mario!",
  'Hello!',
  'Wahoo!',
  'Yahoo!',
  'Woo-hoo!',
  'Yippee!',
  'Mamma mia!',
  'Mamma mia...',
  'Okey-dokey!',
  "Let's-a go!",
  'Here we go!',
  'Ha-ha!',
  'Wa... hoo!',
  'Spaghetti!',
  'Thank you so much!',
  'Bye-bye!',
];
export const MARIO_TALK = [
  {
    id: 'meet',
    nodes: {
      a: {
        say: 'Oh. Oh no. Oh no, no, no. You are... HIM. The plumber. On MY island. And I look like this. I always look like this, but today I feel it.',
        mood: 'worry',
        opts: [
          { say: "It's-a me, Mario!", to: 'b' },
          { say: 'Hello!', to: 'b' },
        ],
      },
      b: {
        say: 'It IS you! Assalomu alaykum, Mister Mario. Sir. Mister Sir. I have a business. Melons. Would you like a melon? I do not have a melon.',
        mood: 'worry',
        opts: [
          { say: 'Wahoo!', to: 'c' },
          { say: 'Mamma mia!', to: 'd' },
        ],
      },
      c: {
        say: 'He said wahoo. To ME. Oyijon will never believe this. Can you say it again? Slower. For my memories.',
        mood: 'joy',
        opts: [{ say: 'Wa... hoo!' }, { say: 'Yahoo!' }],
      },
      d: {
        say: 'Mamma mia, yes! Mamma mia indeed! I am also mamma mia! ...What does it mean? It does not matter. I will put it on a shirt.',
        mood: 'joy',
        opts: [{ say: 'Okey-dokey!' }, { say: "Let's-a go!" }],
      },
    },
  },
  {
    id: 'autograph',
    nodes: {
      a: {
        say: 'Mister Mario! Would you sign something? I do not have paper. Or a pen. Or hands. Could you sign... me?',
        mood: 'worry',
        opts: [
          { say: 'Okey-dokey!', to: 'b' },
          { say: 'Mamma mia...', to: 'c' },
        ],
      },
      b: {
        say: 'Here, on my side. ...You jumped on my head. Is that the autograph? It is perfect. I will never wash again. I never washed before, but now it is on purpose.',
        mood: 'joy',
        opts: [{ say: 'Yahoo!' }, { say: 'Thank you so much!' }],
      },
      c: {
        say: 'Too much? Too much. Sorry. I am normal. A normal blob talking to a normal plumber. Ha ha. Do you want a ride? NO. Nobody rides. Except... no. No.',
        mood: 'worry',
        opts: [{ say: 'Ha-ha!' }, { say: 'Here we go!' }],
      },
    },
  },
  {
    id: 'deal',
    nodes: {
      a: {
        say: 'Mister Mario, I have a business idea and only you can help. Mario melons. They jump. Your face on every one. Fifty-fifty?',
        mood: 'worry',
        opts: [
          { say: "Let's-a go!", to: 'b' },
          { say: 'Mamma mia!', to: 'c' },
        ],
      },
      b: {
        say: 'He said let us go! We are partners! I will draw the contract. With what? I do not have hands. You draw it. You have famous hands.',
        mood: 'joy',
        opts: [{ say: 'Wahoo!' }, { say: 'Okey-dokey!' }],
      },
      c: {
        say: 'Seventy-thirty? For you! Eighty! Ninety! Mister Mario, you drive a hard bargain without saying anything.',
        mood: 'worry',
        opts: [{ say: 'Ha-ha!' }, { say: 'Yippee!' }],
      },
    },
  },
  {
    id: 'questions',
    nodes: {
      a: {
        say: 'Sorry, I am sweating. A blob sweats everywhere at once. Question. Is it true you jump into paintings?',
        mood: 'worry',
        opts: [
          { say: 'Wahoo!', to: 'b' },
          { say: 'Here we go!', to: 'b' },
        ],
      },
      b: {
        say: 'I KNEW it. I have a painting of a melon field in my head. Jump in! No, wait, come back, you cannot jump into a head.',
        mood: 'worry',
        opts: [
          { say: 'Mamma mia!', to: 'c' },
          { say: 'Woo-hoo!', to: 'c' },
        ],
      },
      c: {
        say: 'Okay. Last question. What is your favorite fruit? Say melon. ...Mister Mario, please say melon.',
        mood: 'worry',
        opts: [{ say: 'Spaghetti!' }, { say: 'Thank you so much!' }],
      },
    },
  },
];
export const MARIO_AFTER = [
  'He talked to me. He TALKED to me!',
  'I need to lie down. For one week.',
  'Bye-bye, Mister Mario! Come back! Or do not! Both are an honor!',
  'Nobody will believe this. I do not believe this.',
];
export const MARIO_GIFT = 'Here we go!';
export const MARIO_GIFT_GASP = 'A present? From MARIO?!';
export const MARIO_GIFT_OPTS = ['Wahoo!', 'Okey-dokey!'];
