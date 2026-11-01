# Sharing and joining: links, codes, previews and the Home Screen

*Research report, 1 November 2026. How web and party games get a friend from "come play" to standing next to you: room links versus room codes (Jackbox, Among Us, Kahoot, AirConsole, skribbl.io, Gartic Phone, agar.io and diep.io party links, Roblox invites, Steam's Invite Anyone), what spreads a link-shared game (Wordle's grid, agar.io), the platform pieces (the Web Share API and clipboard, Open Graph previews in Discord and iMessage, Home Screen web apps and Web Push on iPadOS), "your friend is here" signals (Roblox, Discord activities and Rich Presence) and room privacy (Jitsi's guessable names, Jackbox and Among Us hiding codes). Builds on [wordless-onboarding.md](wordless-onboarding.md) (the first 30 seconds after the link opens, late joiners arriving near the group) and [webgpu-on-ipad.md](webgpu-on-ipad.md) (Home Screen mode, storage split) without repeating them. Serves DESIGN.md 8 (Designed for drop-in, drop-out). Recommendations only; nothing here is decided. Checked with web search and page fetches; Apple's own link-preview technote (TN3156) would not render for fetching, so the iMessage details are third-party.*

**Markers.** **[V]**: the page was fetched and the words match. **[S]**: seen only in a search summary, a fan wiki, a vendor page or a forum; check before quoting. Boogle facts come from the code: rooms from `?room=` (`getRoomId()` in [src/netplay/net.ts](../../src/netplay/net.ts), `[a-z0-9-]{1,32}`, default `beach` in [src/constants.ts](../../src/constants.ts)), the pause view's Room page with "Copy invite link" ([src/features/pause.ts](../../src/features/pause.ts)), the lobby line "Nobody else is on the island yet. Share this page to bring friends." ([src/player/hud.ts](../../src/player/hud.ts)), 8 players per room, `index.html` with a manifest and Apple tags but no Open Graph tags, `start_url: "./"` in [public/manifest.webmanifest](../../public/manifest.webmanifest), and `GET /rooms/:id/snapshot` on the server ([server/src/server.js](../../server/src/server.js)), which serves any room's world to anyone who knows its name.

## Summary

1. **Links beat codes when friends are on different screens; codes win when they are in one room.** skribbl.io, Gartic Phone and the .io party links are a URL you paste into chat [S]; Jackbox, Kahoot and AirConsole show a short code on a shared screen that phones type in [V/S]. Boogle is played on separate iPads and laptops, mostly invited over group chats, so the link is the main path and a code is a fallback for reading aloud.
2. **The default room is a public room.** Everyone who opens boogle.club with no `?room=` lands in `beach` together. Jitsi says the room name is all it takes to get in and that names like "Test" or "Yoga" draw strangers [V]; the same holds for `beach`, and for `/rooms/beach/snapshot`.
3. **Codes get longer and filtered as they scale.** Jackbox's 4 random letters spelled rude words, so a blocklist was added [V]; Among Us went from 4 to 6 letters in 2020.9.9 when it passed a million concurrent players [S]. A friends' game needs unguessable, not short: Jitsi's generator draws from over a trillion names [V].
4. **People share into group chats, not public feeds.** Wardle says most Wordle players shared in family and friends' WhatsApp groups, and that the grid came from a player typing it by hand [V]. The share is a small, spoiler-free message; Wordle's left out the link and drew criticism for it [S].
5. **The Web Share API works in Safari and on iPadOS** (since 12.1/12.2 [S]), needs a tap and HTTPS, throws `AbortError` when the sheet is cancelled, and is absent in desktop Firefox; the usual fallback is the clipboard [V web.dev].
6. **Link previews are read from the raw HTML, without JavaScript.** Discord makes one GET, reads `og:title`, `og:description`, `og:image`, `og:site_name`, `theme-color` and `twitter:card` (`summary_large_image` gives a big image), trims titles at 70 bytes and descriptions at 350, and caches for about 30 minutes [V]. iMessage builds the card on the sender's device from the same tags [S]. Boogle has none of these tags today, so its links unfurl as a bare title.
7. **On iPadOS 26 every site added to the Home Screen opens as a web app, with no install prompt to trigger** [V]. The installed app has its own storage (a new pid), doesn't capture links (a friend's link opens in Safari, not the app), and launches `start_url`, which for Boogle drops `?room=` [V firt.dev].
8. **Installed web apps can get Web Push and badges** (iPadOS 16.4+, after a tap-triggered permission, `display: standalone`; Declarative Web Push since 18.4) [V]. That is the only way an iPad player can hear "your friend is on the island" while Boogle is closed.
9. **Joining a friend should skip everything between the link and the friend.** Roblox's 2023 invite update puts online friends first, sends invite toasts, bypasses matchmaking to land on the inviter's server, queues instead of failing when full, and still loads you in if the friend has gone [V]. Discord activities put everyone in a channel into one instance [V].
10. **Hiding a code only helps if the code is the key.** Jackbox and Among Us hide room codes on stream [V/S]; Among Us's streamer mode replaces the code with "Click to copy" [S]. Boogle's room name is the key to the room and the save, so how it's chosen matters more than how it's displayed.

## 1. Links and codes

### Jackbox (Fibbage blog, 2014; streaming guides)

- Room codes are "just 4 randomly generated letters". Random letters spelled rude words often enough that Jackbox built a filter for "the most egregious possible words" ([Room [CENSORED] Codes](https://www.jackboxgames.com/blog/room-censored-codes)) [V]. A fan project keeps a list of the blocked codes ([Bad-Room-Codes](https://github.com/Meorge/Bad-Room-Codes/blob/master/README.md)) [S].
- The code exists because the game runs on one shared screen (a TV) and everyone joins from phones at jackbox.tv: the code is read off the screen, not sent. For streams, Jackbox added passworded rooms and Room Code Hiding, which keeps the code off screen until the host shows it ([safety and moderation](https://www.jackboxgames.com/blog/safety-and-moderation-streaming-jackbox-games), [Party Pack 8 features](https://www.jackboxgames.com/blog/streaming-moderation-accessibility-features-jackbox-party-pack-eight)) [S].

### Among Us (Innersloth)

- A host sets the lobby Public (listed in Find Game) or Private; for a private lobby "you'll have to give your friends the six letter code" ([Innersloth help](https://innersloth.zendesk.com/hc/en-us/articles/7094139368980-How-do-I-host-a-lobby)) [S]. Codes were 4 characters until 2020.9.9, when Innersloth moved new rooms to 6 to cut server load after passing a million concurrent players; the new build could still join old 4-letter rooms ([devtracker post](https://devtrackers.gg/among-us/p/003032ff-pinned-servers-update-2020-9-9-beta), [version history](https://among-us.fandom.com/wiki/Among_Us/Version_history)) [S]. The change broke joins for players on older builds for a while ([DBLTap](https://www.dbltap.com/posts/among-us-6-digit-code-error-how-to-fix-01ej97t5fr9a)) [S].
- Streamer Mode (June 2022) hides the code in the lobby behind "Click to copy" ([Player.One](https://player.one/among-us-streamer-mode-added-latest-update-148266)) [S]. Nothing stops someone who already has the code; the fix for a leaked code is a new lobby.

### Kahoot and AirConsole (one screen, many phones)

- Kahoot players join at kahoot.it with a game PIN or by scanning a QR code that opens the session directly, mostly without an account ([Kahoot support](https://support.kahoot.com/hc/en-us/articles/360039890713-Kahoot-join-How-to-join-a-Kahoot-game)) [S]. A host asked for QR posters because people at the back of a large event couldn't read the PIN [S].
- AirConsole shows a connect code at airconsole.com on the big screen; phones open airconsole.com in a browser (or the app), pick Guest and type it on a number pad ([AirConsole help](https://airconsole.zendesk.com/hc/en-us/articles/360014511400-Connect-Code)) [S]. QR codes are documented for car screens only.

### skribbl.io, Gartic Phone, agar.io and diep.io (links in chat)

- skribbl.io: Create Private Room, copy the invite link, send it; only people with the link get in. An old forum note says a link to a room that no longer exists drops you into a random public game ([Smogon thread](https://www.smogon.com/forums/threads/skribbl-gartic.3605391/)) [S].
- Gartic Phone links carry the room in a query parameter (`garticphone.com/en/?c=01a118f777`, posted on itch.io) [S]; one commenter had been sent the create-a-lobby page instead of the room, a common mistake when the "copy" button and the address bar disagree ([itch.io](https://itch.io/post/8447995)) [S].
- agar.io's Party mode makes a code in the URL fragment (`agar.io/#XNESE`); diep.io has a "copy party link" button at the top right. Both need everyone on the same server and version ([agar.io guide](https://nems.is/en/blog/how-to-play-agario-with-friends), [diep.io wiki thread](https://diepio.fandom.com/f/p/2780380365062614168)) [S].
- agar.io itself spread with no marketing beyond one 4chan post, through YouTubers and streamers; Valadares credits simple controls and goals ([Wikipedia](https://en.wikipedia.org/wiki/Agar.io), [GamesBeat](https://gamesbeat.com/the-surprising-momentum-behind-io-games-like-agar-io/)) [S]. The link was the whole funnel: no install, no account.

### Roblox invites (official announcement, December 2023)

The invite sheet looks the same everywhere, lists online and closest friends first, and sends invite toasts (mobile first) plus push notifications for those who opt in. Joining from an invite skips matchmaking and lands you on the inviter's server; a full server shows a queue instead of an error; if the friend has left you still load in, with a prompt to follow them or invite them back. A banner confirms you joined your friend ([DevForum](https://devforum.roblox.com/t/updates-to-invites-joining-friends-just-got-easier/2729692)) [V]. Roblox also makes "Share Invite Link" URLs to the current server; an expired one asks whether to join anyway ([DevForum thread](https://devforum.roblox.com/t/whats-the-share-invite-link-button-supposed-to-do/2177314)) [S].

### Steam Remote Play Together, Invite Anyone (2021)

From the Steam overlay a host copies a link that lets one friend without a Steam account join through the free Steam Link app on Windows, macOS, Linux, iOS or Android ([PC Gamer](https://pcgamer.com/au/steam-remote-play-together-now-works-with-people-who-dont-have-steam), [Engadget](https://www.engadget.com/steam-remote-play-together-account-invite-anyone-175017613.html)) [S]. Even Valve, with accounts everywhere, built a no-account path for the friend who just got a link.

## 2. What makes people share

### Wordle (Josh Wardle, TechCrunch 2022)

- An early player in New Zealand typed the coloured squares by hand to post her results; Wardle built the grid into the game and says it had a huge effect. Before it, friends just said "I got it in three". Most players don't post publicly; they share in family and friends' group chats, which Wardle describes as a low-effort way to keep in touch ([TechCrunch](https://techcrunch.com/2022/01/12/josh-wardle-interview-wordle/)) [V].
- He also credits everyone solving the same word each day, and no accounts, ads or app. The grid shows how you did "without spoiling it" ([Syntax transcript](https://syntax.fm/show/430/creator-of-wordle-josh-wardle/transcript)) [S]. Wardle was criticised for leaving the game's URL out of the grid ([Game Developer](https://www.gamedeveloper.com/marketing/josh-wardle-reflects-on-the-the-unconventional-road-to-wordle-s-success)) [S]; the grid made people ask "what is this?", which worked for a puzzle everyone could find by name.
- Marketing Examples frames it as the difference between "share" giving you a link nobody clicks and giving you something worth pasting, with about 50,000 shares a day cited ([Marketing Examples](https://marketingexamples.com/referral/wordle)) [V].

## 3. Platform pieces

### Web Share API and the clipboard

- `navigator.share({ title, text, url })` opens the system share sheet. It needs HTTPS and a user gesture; cancelling throws `AbortError`, which should be ignored. web.dev's pattern feature-detects `'share' in navigator`, shares the canonical URL, and falls back to another route when it's missing ([web.dev](https://web.dev/patterns/web-apps/share)) [V]. Support: Safari 12.1, iOS 12.2, Chrome 128 on desktop, Edge 93; Firefox desktop has no position ([web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/share)) [S].
- Jeremy Keith found that on iOS, when both `text` and `url` are given, some share targets (like Copy) take only the text ([adactio](https://adactio.medium.com/the-web-share-api-in-safari-on-ios-a192dd607a0e)) [S]. Putting the URL in `url` and keeping `text` short avoids losing the link.
- On iPadOS, Web Share has been supported since 12.1 and the clipboard since 12.0, in Safari and Home Screen apps ([firt.dev](https://firt.dev/notes/pwa-ios/)) [V].

### Link previews: Discord

Discord's own docs ([Link Previews](https://docs.discord.com/developers/link-previews/overview)) [V]:

- Tags read: `og:title`/`twitter:title` (falling back to `<title>` plus `meta description`), `og:description`, `og:site_name` (shown above the title), `og:image` with `og:image:width`/`height`/`alt`, `theme-color` (the accent bar, `#RRGGBB`), `og:type` and `twitter:card`.
- Layout: by default text with a small image; `twitter:card=summary_large_image` puts a large image below; `og:type=video.*` with a video file gives an inline player (Boogle's patch-video pages in [dev/video/site.mjs](../../dev/video/site.mjs) already do this); two to four `og:image` tags make a gallery.
- Limits: title 70 bytes, description 350 bytes, URL 2,048 characters; png, jpg, webp, gif or avif images.
- One GET, no JavaScript, a 2xx `text/html` answer within 10 s; previews are cached about 30 minutes (add `?v=2` to see a change).

Discord **activities** (games inside a voice channel, Embedded App SDK) work differently: everyone who presses Join Application in a channel gets the same `instanceId`, which the app uses as the key for its shared state; the instance ends when the channel empties ([multiplayer guide](https://docs.discord.com/developers/activities/development-guides/multiplayer-experience)) [V]. A `shareLink` command (SDK 1.9.0, 2025) opens a share modal with custom query parameters ([releases](https://github.com/discord/embedded-app-sdk/releases)) [S]. Rich Presence's "Ask to Join" appears when a game reports a party id, current and max size and a join secret, and the docs say to leave the secret out when joining isn't possible ([Rich Presence with the Game SDK](https://docs.discord.com/developers/rich-presence/using-with-the-game-sdk)) [S]. Neither applies to a plain browser tab; they show what a "join" button carries: who, how many of how many, and whether you can come in now.

### Link previews: iMessage

- Messages generates the preview **on the sender's device**: it fetches the page's metadata and image before sending, so the recipient sees the card without loading the page ([developer blog](https://www.hitemupapp.com/blog/why-link-previews-dont-always-work-in-hit-em-up-and-how-to-fix-it/)) [S]. Apple's TN3156, "Create rich previews for Messages", is the primary source but would not render for fetching.
- Third-party guides agree on `og:title` and `og:image` (absolute HTTPS URL, no tags added by script), and disagree on size: 1200×630 is common, 1200×1200 square survives iMessage's crops best, and some devices drop images under 900 to 1200 px wide ([OpenGraph+](https://opengraphplus.com/consumers/apple/images), [ogfixer](https://ogfixer.com/blog/imessage-link-preview-not-working)) [S]. Apple also points to a high-resolution `apple-touch-icon` for the small icon ([The SMS Works](https://thesmsworks.co.uk/blog/sms-link-previews/)) [S]; Boogle has one at 180 px.
- Previews may not appear automatically when the sender isn't in the recipient's contacts, and a message with several links may get none [S].

### Home Screen web apps on iPadOS

- Safari 26: "By default, every website added to the Home Screen opens as a web app"; there are "zero requirements for 'installability'", the manifest's icons are used, and the user can switch Open as Web App off to get a bookmark ([WebKit, Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)) [V].
- No install prompt or `beforeinstallprompt`; links don't open in the installed app ("Only a push message can open an installed PWA"); storage is separate from Safari's (login cookies are copied since 17.2, localStorage isn't); `display: fullscreen` falls back to `standalone`; manifest `id` since 16.4 ([firt.dev](https://firt.dev/notes/pwa-ios/)) [V].
- The app opens `start_url` from the manifest, query string included; apps have used `start_url` parameters to tag Home Screen launches ([web.dev](https://web.dev/learn/pwa/enhancements), [naildrivin5](https://naildrivin5.com/blog/2023/08/24/braindump-of-pwa-on-ios.html)) [S]. No source says the page's own URL is kept when a manifest sets `start_url`.

### Web Push and badges for Home Screen apps

Since iPadOS 16.4, a web app added to the Home Screen with `display` `standalone` or `fullscreen` can ask for notification permission from a tap and receive standard Web Push through Apple's push service, with no developer account; it can set an icon badge (`setAppBadge`). iOS identifies each install by its name plus the manifest `id`, so two installs can coexist ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)) [V]. Declarative Web Push (iPadOS 18.4) needs no service worker ([WebKit, Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-26-0/)) [V].

## 4. Privacy of rooms

### Jitsi Meet

"The room name is all that one needs to actually access a room." Names like "Test", "Yoga" or "FamilyMeeting" draw uninvited people; `meet.jit.si/coffee` is the example of too guessable. Jitsi's random name generator picks from "over a trillion possible combinations"; a UUID works but is unfriendly; appending random characters to a chosen name is the fallback. A "bad meeting name detector" was planned ([Jitsi security](https://jitsi.org/security/)) [V]. Users later complained the warning appeared even on password-protected rooms ([issue 6998](https://github.com/jitsi/jitsi-meet/issues/6998)) [S].

### The pattern across games

Every game above that lets strangers in by default (agar.io, Among Us public lobbies, skribbl.io's public games) also has a private mode whose key is a code or link only friends have. Hiding the key (Jackbox, Among Us streamer mode) helps streamers; a key that is guessable helps nobody. Boogle's room name is also the key to its saved world over HTTP.

## What this means for Boogle

Today: `boogle.club` drops everyone into the shared `beach` room; `?room=<name>` makes a separate island, but nothing in the game creates one. The Room page copies the current link (with `?room=` left out for `beach`); the lobby says "Share this page to bring friends" and names who is on the island. There are no Open Graph tags, so a pasted link shows only "Boogle". A Home Screen install opens `./` and so always lands in `beach`, with a new identity.

1. **A link is the invite; a short code is the spoken fallback.** Friends are on separate devices and invite each other in group chats, like skribbl.io and Wordle, not across a room like Jackbox. A short code helps when someone is reading it out on a call or typing it on a TV-connected browser: four or five letters from a consonant-heavy alphabet with a Jackbox-style blocklist, mapped by the server to the room name.
   *Smallest prototype:* `?proto=invite` adds a Room page line "Code: KBRT" (the first four letters of a hash of the room, displayed only) and a "Have a code?" box in the lobby that asks a new server route (`GET /code/:code`, answering only for rooms loaded now, so codes can't be used to list rooms) for the room name; see how often playtesters use it over the link.

2. **Give each group of friends its own unguessable island, made in one tap.** Jitsi's lesson applies: `beach` is a public room, and any short word is too. A "New island" action could make `?room=` from two or three friendly words plus a few random characters (`?room=sunny-otter-k7q`), copy the link and reload into it. Whether `beach` stays as a public meeting place or becomes a demo is a design question this report leaves open.
   *Smallest prototype:* a "New island for us" button on the Room page that builds a three-word name from a small word list plus 3 characters from `[a-z0-9]`, writes it into the URL with `history.replaceState` and reconnects; check that `getRoomId()`'s 32-character limit holds for the longest combination.

3. **Share through the system sheet on iPad, copy on desktop.** Replace or pair "Copy invite link" with `navigator.share({ title: 'Boogle', text, url })` where it exists, falling back to the clipboard; ignore `AbortError`. Keep `text` short and the link in `url` (Keith's iOS finding). The message could be Wordle-small and in the group's terms ("Come to our island, 3 of us are here"), never a wall of text.
   *Smallest prototype:* a Share button on the Room page that calls `navigator.share` when present and falls back to the existing clipboard code; send it to Messages, WhatsApp and Discord from an iPad and check that each target receives the URL.

4. **Static Open Graph tags first, then a per-room card.** Discord and iMessage read raw HTML, so tags in `index.html` cover every link today: `og:title` "Boogle", `og:description` of one line about the island and friends, `og:image` an absolute HTTPS URL to a 1200×630 (or 1200×1200) painted still from `npm run look`, `og:image:width`/`height`, `twitter:card=summary_large_image`, `theme-color` matching the manifest's `#0f9fc0`. A per-room card ("Mati's island · 3 here now", a still of that island) needs HTML generated per request, which GitHub Pages can't do; the Fly server could serve a small `/i/<room>` page with those tags that redirects to `boogle.club/?room=<room>`, as `dev/video/site.mjs` does for patch videos.
   *Smallest prototype:* add the static tags and a 1200×630 image to `public/`, paste `boogle.club` into Discord (the Embed Debugger) and into Messages on an iPad, and screenshot both.

5. **Make the Home Screen install keep the room and the player.** `start_url: "./"` drops `?room=`, and the installed app's storage is separate, so today an install is a stranger in `beach`. Two pieces: remember the last room in localStorage and have a bare launch go back to it (inside the installed app this starts empty, so the first launch needs a way in, such as the code box from rec 1); and a "Bring me along" transfer of `boogle.pid`, name and colour from Safari to the app (the pid-transfer codes already planned in [docs/plans/0.1-groundwork.md](../plans/0.1-groundwork.md), "Identity: now and later"). The pause view already tells iPad players to use Add to Home Screen; that advice currently costs them their island.
   *Smallest prototype:* set `start_url` to `./?src=home`, store `boogle.lastRoom` on connect and use it when the URL has no `?room=`; install on an iPad from `?room=test-xyz` and check where the icon lands and what name the player has.

6. **Join straight to the friend who sent the link.** Roblox's rules fit: no screens between link and island beyond Jump in, land near the inviter (wordless-onboarding rec 10 lands joiners near the nearest player; an invite could name the inviter's pid so the joiner lands by them), say who you joined, and when the island is full say who is there and that you're queued (the HUD's "waiting for a spot" exists). A link to a room nobody is in should still open that island, never a random one (skribbl.io's failure).
   *Smallest prototype:* add `&by=<pid>` to shared links; on first spawn, if that pid is in `remotes`, spawn within 6 m of them and show "You joined Mati" for 3 s; two tabs, time link-open to standing together.

7. **"Your friend is here" inside the game: arrivals you can see and hear.** The lobby already lists who is on the island before Jump in. In the world, an arrival could be a light event (wordless-onboarding rec 10's puff and roster pill), and a tab in the background could put the count in `document.title` ("(2) Boogle") so a laptop player sees friends arrive from another tab. Discord's Rich Presence carries the same three facts worth showing in a share message and the lobby: who, how many of 8, and whether there is room.
   *Smallest prototype:* update `document.title` with the remote count while `document.hidden`, and play the honk sound once when a remote arrives while hidden; test with two laptops.

8. **"Your friend is here" outside the game: Web Push for installed iPads, later.** Only Home Screen apps on iPad can receive Web Push, and only after a tap-triggered permission. The server already knows when a pid joins a room; a "Tell me when friends arrive" toggle (installed app only) could store a push subscription per room and send "Mati is on the island" when someone joins an empty-ish room. This needs a service worker or Declarative Web Push, push endpoints allowed from `*.push.apple.com`, and a cooldown so a room of 6 doesn't buzz everyone six times.
   *Smallest prototype:* a Declarative Web Push test page in `dev/` that subscribes from a Home Screen install and receives one push sent by hand from the server; measure delivery time on an iPad.

9. **Treat the room name as a key everywhere it appears.** `GET /rooms/:id/snapshot` serves a world to anyone with the name, the pause title shows it, and a stream or screenshot of the Room page leaks it. Unguessable names (rec 2) cover most of this; a "Hide link on screen" option like Jackbox's and Among Us's helps streamers, and a way to move an island to a new name (copy the save, retire the old name) is Among Us's "new lobby" answer to a leak. No accounts or passwords are needed for friends; Jitsi's passwords reset when everyone leaves and add a step Boogle doesn't need.
   *Smallest prototype:* a per-IP rate limit on `/rooms/:id/snapshot` (and a log of misses, to see whether anyone probes names); and a one-off script that copies `v02-<old>.json` to a new room name.

10. **Give the invite something worth pasting.** Wordle's grid spread because it said something about your game in a few characters. A Boogle invite could carry the island's state in a line ("We've laid 3 of 7 sections · 2 here now") built from `sites` and `remotes`, so the message reads as news rather than an ad, and always with the link, which Wordle left out.
    *Smallest prototype:* generate the share `text` from the sites state and the remote count in rec 3's button; ask two playtesters which of three message drafts they'd send.

### What wasn't checked

Apple's TN3156 on Messages previews (not fetchable), Jackbox's actual blocklist and alphabet, Gartic Phone's and skribbl.io's official invite behaviour (only guides and forum posts), Roblox's share-link API today, and how iPadOS 26 picks the launch URL when a manifest's `start_url` and the page URL differ were seen only second-hand or not at all. None of the prototypes has been tried; recs 4 and 5 are the ones to test on a real iPad first.
