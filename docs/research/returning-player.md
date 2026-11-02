# Coming back: continue, start over and where you land

*Research report, 2 November 2026. What games do when a player returns: whether they ask anything, where you land, and what "start over" means when the world is shared. Serves DESIGN.md 8 (Designed for drop-in) and 9 (Leave something for the next visitor). Builds on [wordless-onboarding.md](wordless-onboarding.md), which covers first arrivals. Recommendations only; nothing here is decided. This was a quick pass: most sources are support pages, community wikis and opinion pieces rather than developer talks, and searches on Fall Guys, Among Us, Sky, A Short Hike, Terraria, Don't Starve Together, Sea of Thieves and Breath of the Wild found nothing usable. Where a line below rests on a community source, it says so.*

## Summary

1. Players press Continue far more often than New Game, so a returning player's first option is the one that carries on, and it can skip the menu altogether.
2. Shared-world games keep the person and the world apart. That split decides what "start over" can mean, because it can only ever reset the person.
3. Survival and sandbox games bring you back where you logged out; a spawn point is for people with no record.
4. Resetting is rare and destructive, so games put it out of the way and confirm it. They don't ask every time you open the game.
5. The first seconds back should feel good, not be a list of changes or chores.
6. A browser identity can vanish at any time. That is the strongest reason to keep the start-over path cheap and the return path silent.

## Asking, or just continuing

- **Continue comes first.** A critique of menu design argues most players choose New Game once and Continue every other time, and "The Ten Commandments of Video Game Menus" makes the same case for putting the primary action first ([Kotaku](https://kotaku.com/the-ten-commandments-of-video-game-menus-5955855), [TechSpot](https://www.techspot.com/news/62281-ten-commandments-video-game-menus.html)). Developer forums show Continue appearing only once a save exists ([Adventure Creator](https://adventurecreator.org/forum/discussion/comment/56030)). Informal guidance, not a standard.
- **Some games skip the menu.** Giant Bomb lists games whose press-start screen loads the latest save straight away ([Giant Bomb](https://giantbomb.com/games-that-ask-you-to-press-start-but-will-accept-/3015-4403/)). Poki tells web games to skip title screens for first-timers, and its numbers tie loading time directly to how many people start playing ([wordless-onboarding.md](wordless-onboarding.md), section 4).

## The person and the world

- **Valheim** keeps characters and worlds as separate saves. You pick a character first, and it carries its progress into any world ([xGamingServer](https://xgamingserver.com/docs/valheim/transfer-character), [James A. Chambers](https://jamesachambers.com/backing-up-valheim-local-worlds-and-characters-guide/)). "New" is a button on the character list, beside the existing ones ([Shockbyte](https://shockbyte.com/pt/help/knowledgebase/articles/how-to-create-a-valheim-character)).
- **Animal Crossing: New Horizons** has one island per console and one resident per user account, so several people share an island as different residents. The first resident holds the island's milestones ([Nintendo](https://www.nintendo.co.uk/Support/Nintendo-Switch/Can-I-Change-Which-Island-Resident-is-the-Resident-Representative-Animal-Crossing-New-Horizons--1956294.html)). Deleting a resident is a settings option behind the minus button on the title screen, and afterwards the game returns to resident creation; the island carries on ([Nintendo](https://en-americas-support.nintendo.com/app/answers/detail/a_id/54727)).
- **Stardew Valley** ties each farmhand to a cabin on the host's farm, with their own inventory, skills and relationships ([gameserverkings](https://www.gameserverkings.com/knowledge-base/stardew-valley/stardew-valley-multiplayer.md)). The way out is the host demolishing the cabin, which puts the occupant's things in a chest where it stood (community sources). Everything else on the farm stays.
- **Big Walk:** only the host has to stay the same between sessions, and new players can join an existing playthrough at any time ([unofficial guide](https://p13-bigwalk.pages.dev/guides/how-to-host-and-join)).

## Where you land

- **Minecraft** keeps each player's position in their own data file, so you come back where you left. A player with no file spawns at world spawn with nothing, and deleting the file is how an admin fully resets someone ([Akliz](https://help.akliz.net/docs/reset-a-players-location-and-inventory-on-a-minecraft-server)). Community sources; not checked against Mojang's own documentation.
- **Roblox** leaves this to each game. Forum threads save position when a player leaves and every few seconds in case of a crash, and warn about putting a player back inside something: lift them a little above the saved spot ([DevForum](https://devforum.roblox.com/t/how-do-i-make-it-so-when-you-leave-game-you-spawn-at-your-location-where-you-left-your-game/777633), [DevForum](https://devforum.roblox.com/t/save-location-problem/2799794)).

## The first seconds back

- **Be glad you came.** GamesBrief: the first feeling should be "ah, I'm glad I opened this game!"; chores aren't banned, but "the first seconds after I log in aren't the right time" ([GamesBrief](https://gamesbrief.com/?p=11267)). Its good examples open on what you earned while away.
- **Changes are the returner's real obstacle.** A Warframe community page calls knowing what changed the main hurdle ([Guild Order](https://guildorder.com/games/warframe/wiki/the-content-cadence-and-returning-players)), and Destiny 2's opening recap of your own past deeds is a well-liked touch ([Twinfinite](https://twinfinite.net/2017/09/destiny-2-starting-screens-recap-your-guardians-legacy/)). Boogle's welcome-back card already does the plain version.

## Identity in a browser

Progress kept in localStorage goes with private windows, another browser or cleared site data ([FRVR](https://frvr.com/blog/game-guides/how-browser-games-save-progress/)). Guest accounts elsewhere are tied to one device, and an upgrade only helps if it happens before the device is lost ([Riot](https://support.riotgames.com/en-us/riot/account/riot-games-guest-accounts-guide)). Boogle's `adoptPid` ([src/player/identity.ts](../../src/player/identity.ts)) is already the seam for a later transfer code.

## What this means for Boogle

Today a return goes straight in at the usual spawn with a welcome card. Your name, colour, pid, hotbar and Boogler friendship live in this browser; the world and its plaque lines live on the server. So "start over" can only mean a new person: the world and what you've built stay, as with Animal Crossing's residents.

1. **Don't ask on every return.** Asking costs every visit to serve a rare one, against Continue-first and DESIGN.md 8. Go straight in.
   *Smallest prototype:* it's already how returning works.
2. **Put the way out in the greeting: "Not you?"** The welcome-back card names you, which is the moment someone on a shared iPad or a friend's laptop notices it's wrong. A small link for its few seconds covers that case at no cost to anyone else. Web sign-ins do the same.
   *Smallest prototype:* a link on the welcome-back card that opens the start-over confirm.
3. **Also put Start over in the pause view's You section,** where name and colour already are, and confirm it once in words: "Start over as someone new? The island keeps everything." Animal Crossing and Minecraft both keep this out of the way.
4. **Start over means a new pid, then the fall.** Clear name, colour, hotbar and friendship, mint a pid, and reload into the first visit. The old name's plaque lines stay, as DESIGN.md 5 and 6 want: nobody's work is undone. Keep the old pid and key in a backup slot for now, so a mistaken press isn't final.
5. **Separate what Leave does.** It reloads onto the old card today only so a player can change name or colour, which the You section now does. Decide whether it stays at all.
6. **Come back where you left, per room.** Save your position in the room's existing memory (`boogle.visit.<room>`, written every 5 s and on hide), lifted a little on return. Use the usual spawn when there's no record, the world namespace changed, the spot is in the sea or the ground there has moved.
7. **An invite beats your saved spot.** If you came by a friend's link, land near them; recommendation 10 in [wordless-onboarding.md](wordless-onboarding.md) already points this way. Your saved spot is for when you open the game by yourself.
8. **Open with something good.** Keep the welcome-back card, and let it lead with what grew. A rail network that banks one project while nobody plays is exactly the "while you were away" payoff GamesBrief describes.
9. **A transfer code, later.** Before people have much to lose, or before public playtests, offer a code that moves your pid to another device through `adoptPid`. Not needed for friends yet.
