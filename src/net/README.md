# Networking

`room.ts` is the one module the game talks to for multiplayer: `src/netplay/net.ts` calls `createRoom({ roomId, server,
peerOptions, hostScore, build })` (and takes `defaultHostScore` from `peer-room.ts`). With no server it is a plain
peer-room; with one it is a switching room over three transports: `ws` (the server hosts the room, `ws-room.ts`),
`peer` (a browser hosts it over PeerJS on our signaling) and `fallback` (our server unreachable: a browser hosts
`<room>-fb` on the public signaling), moving between them as the server comes and goes (docs/plans/server-host.md,
"Transitions"). Every transport has the interface below. It implements the host-peer design in
[PLAN.md](../../PLAN.md) ("Key decision"); message types and host migration are documented at the top of the file.
Changes must keep this interface; run `npm run test:net` after touching it.

```js
const room = await createPeerRoom({ roomId, /* the peer transport */ signal /* optional {host,port,path,secure} */, iceServers /* optional */, maxPeers /* optional, default MAX_PEERS = 8, host included */, hostScore /* optional () => number: how good a host this tab is; default: hidden 0, touch 2, desktop 3 */ });
// rejects with code 'room_full' (and `max`) when the host turned this tab away: the room has maxPeers already
room.selfId            // string, stable per tab for the life of the page (NOT the PeerJS id)
room.presence(patch)   // Promise<void>; shallow-merges patch into my presence (value null deletes key) and broadcasts
room.peers()           // frozen array of entries
room.onPeers(handler, onError) // handler({ peers, joined, left, updated }); called once soon after subscribe with all current peers in `joined`. returns unsubscribe
room.onConnection(handler, onError) // handler(connected: boolean). returns unsubscribe
room.send(msg)         // reliable, ordered JSON message to every OTHER peer (relayed through host)
room.onMessage(handler) // handler(msg, fromId). returns unsubscribe
room.isHost()          // boolean
room.transport         // 'peer' | 'server' | 'fallback' (fallback: peer-hosted on the public signaling server)
room.isLead()          // true when this tab publishes Host-kind fields (addHostField); a peer room's lead is its host
room.onLeadChange(h)   // h(isLead); returns unsubscribe. On a peer room the same events as onHostChange
room.linkStats()       // Promise<[{ peer, fast, relay, local, remote, rttMs }]>: the ICE pair each open link uses (a client's link to the host, or the host's to each client); relay = goes through TURN; fast = presence rides the unreliable fast lane
room.onHostChange(handler) // handler(isHost: boolean). returns unsubscribe
room.close()
// peer entry: Object.freeze({ peer: string /*stable selfId of that tab*/, sameTab: boolean /*true for me*/, presence: object, updatedAt: number })
```

`ws-room.ts` implements the same interface for a room our server hosts (docs/plans/server-host.md): `createWsRoom({
roomId, server, build })`, one WebSocket (wire: `ws-wire.ts`), `transport: 'server'`, `isHost()` always false (the
server's sync is the lockstep host; its messages come `from` `SERVER_ID`), a lead the server picks (the oldest visible
tab), plus `onRedirect(h)` and `downMs()` for the room picker. It rejects with `room_full` (+ `max`), `peer_hosted`,
`unreachable` or `browser-incompatible`, then reconnects by itself. Its peer table is `peer-table.ts`. Tested by
`dev/peer-test/ws-run.ts` (in `npm run test:net`), which also drives `room.ts` through every move.

The game uses `entry.sameTab` to learn its own id (`net.myPeer = entry.peer`) and `entry.peer` for ball-ownership
tie-breaks, so `peer` must be the stable `selfId`, not the PeerJS id.

The room id comes from the page URL (`?room=beach`, default `beach`, sanitized to `[a-z0-9-]{1,32}`).

Messages are wire format shared with tabs on older builds: add new `t` types and fields, never change what an existing
one means (AGENTS.md, "Mixed builds").
