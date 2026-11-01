# Playtest kit: the haul

Step 1 of [find the fun](../plans/find-the-fun.md): is hauling fun as a toy? No new mechanics, only a way to tune and
test the haul that is already built ([docs/game-design/haul.md](../game-design/haul.md)). Written for one player.

## Open it

https://boogle.club/?proto=haul&room=proto-haul (any room whose name starts with `proto-` works; use a fresh one such
as `proto-haul-2` for a clean save). The **Haul kit** panel sits top right; tap its title to fold it away.

- **This tab (feel):** stack sway, sway past the soft cap, sway speed, pour cadence, pieces per pour, pickup flight.
  Only your screen, instant.
- **Whole room (lockstep):** wood section cost, helper hut cost, soft cap, hard cap, spill per jump, logs per take,
  takes per bundle, bundle refill interval (ticks, 10 per second). Changes the room's world on release; only in a
  `proto-` room.
- **Reset haul** (tap twice): empties every stack and pile, puts all three sites back to the start and fills every
  bundle. The tuning stays. **Defaults** puts every knob back to the shipped numbers. **Copy values** copies one line
  with every number.

The ?proto=haul flag on its own changes nothing in the game; without it there is no panel.

## Try (about 15 minutes)

1. **Haul with no goal, 2 minutes.** Take logs from a few palms (E), walk around with the stack, jump. Don't pour.
2. **Jump with a big stack.** Get past the soft cap (chip turns orange) and jump: watch the spill. Try a few spill and
   soft-cap values.
3. **Fill a section.** Pour into Section 1's Track ring (stand in the gold ring). Note how many trips it takes.
   Then Reset haul, change the section cost or logs per take, and fill it again.
4. **Pour.** Try faster and slower pours and bigger and smaller handfuls.
5. **Watch a machine run.** Start the machine (E at the sign) and watch the 50 s run to the end.

## Answer

1. Does carrying a wobbly stack feel good with no goal?
2. Does filling a rail section feel like effort or a chore?
3. Which numbers changed how it felt, and to what?

## Write down

An entry in [docs/playtests.md](../playtests.md): the date, the answers above in a sentence each, what felt off, and
the **Copy values** line for the numbers you liked (and for any that felt clearly wrong). If hauling is a chore, say
so plainly: [boogle-2.md](../proposals/boogle-2.md) says to test a different core loop before building trains on it.
