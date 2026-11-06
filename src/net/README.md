# Networking

`ws-room.ts` is the one module the game talks to for multiplayer: `src/netplay/net.ts` calls `createWsRoom({ roomId,
server, build, debug })`. Our server hosts every room (docs/plans/server-host.md): one WebSocket per tab (wire:
`ws-wire.ts`), the server's sync is the lockstep host (its messages come `from` `SERVER_ID`), and the server picks a
lead, the oldest visible tab, which publishes Host-kind fields. The room reconnects by itself (header of `ws-room.ts`);
its peer table is `peer-table.ts`. Changes must keep this interface; run `npm run test:net` after touching it
(`dev/peer-test/ws-run.ts` runs the real server in-process).

```js
const room = await createWsRoom({ roomId, server /* our server's http(s) base */, pid /* this player */, build /* optional */, debug /* optional */ });
// rejects with code 'room_full' (and `max`), 'peer_hosted' (a server not hosting this room), 'unreachable' or
// 'browser-incompatible', or 'incompatible' (shared tuning catalog differs); after joining, a reconnect turned away as full, or 'elsewhere' (a newer tab with the same
// pid joined), reports a fatal error to onPeers/onConnection
room.selfId            // string, stable per tab for the life of the page
room.presence(patch)   // Promise<void>; shallow-merges patch into my presence (value null deletes key) and broadcasts
room.peers()           // frozen array of entries
room.onPeers(handler, onError) // handler({ peers, joined, left, updated }); called once soon after subscribe with all current peers in `joined` (me included), then on remote changes only: my own presence() updates show in peers() but don't call it. returns unsubscribe
room.onConnection(handler, onError) // handler(connected: boolean). returns unsubscribe
room.send(msg)         // reliable, ordered JSON message to every OTHER tab (relayed by the server; held while reconnecting)
room.onMessage(handler) // handler(msg, fromId). returns unsubscribe
room.transport         // 'server'
room.isLead()          // true when this tab publishes Host-kind fields (addHostField)
room.onLeadChange(h)   // h(isLead); returns unsubscribe
room.linkStats()       // Promise<[{ peer: 'server', rttMs }]>: the heartbeat round trip
room.pause(ms)         // tests: drop the socket as a network loss would, reconnects held for ms
room.close()
// peer entry: Object.freeze({ peer: string /*stable selfId of that tab*/, sameTab: boolean /*true for me*/, presence: object, updatedAt: number })
```

The game uses `entry.sameTab` to learn its own id (`net.myPeer = entry.peer`) and `entry.peer` for ball-ownership
tie-breaks, so `peer` must be the stable `selfId`.

The room id comes from the effective page flags (`src/proto/flags.ts`): the bare URL opens Place in `boogle`, classic and headless tools default to `beach`, and explicit prototypes retain their rooms. An explicit `?room=` wins, sanitized to `[a-z0-9-]{1,32}`.

Messages are wire format shared with tabs on older builds: add new `t` types and fields, never change what an existing
one means (docs/agents/mixed-builds.md, "Mixed builds").

Current classic `v07-` and playable railway `t1v02-` rooms require the client's `tc` catalog fingerprint at admission. It includes shared tuning
defaults, bounds, keys and interpretation; different fingerprints get `incompatible` and close code 4412 before a
room is created or joined. Older classic `vNN-` namespaces are refused before loading or migrating their saves,
even when explicitly configured or presenting the current catalog. A matching fingerprint permits different build SHAs. The transport stops reconnecting
on this refusal. Headless railway `t1v01-` rooms, which have no tuning profile, keep their existing contract. Shared tuning writes additionally need an
explicit server `TUNE_CONTROLLER_KEY` matching the sender's bound socket key; being the room lead grants nothing.
