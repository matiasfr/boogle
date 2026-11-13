# Networking

`src/netplay/net.ts` uses only `ws-room.ts` for multiplayer: `createWsRoom({ roomId, server, build, debug })`.
The server hosts every room (docs/plans/server-host.md), owns shared state and sends clock/replication `from`
`SERVER_ID` over one WebSocket per tab (`ws-wire.ts`). The oldest visible tab leads Host-kind fields.
Rooms reconnect automatically (`ws-room.ts` header); `peer-table.ts` tracks peers. Keep this interface;
run `npm run test:net` after edits (`dev/peer-test/ws-run.ts` uses the real server).

```js
const room = await createWsRoom({ roomId, server /* our server's http(s) base */, pid /* this player */, build /* optional */, debug /* optional */ });
// rejects with code 'room_full' (and `max`), 'peer_hosted' (a server not hosting this room), 'unreachable' or
// 'browser-incompatible'; after joining, a reconnect turned away as full, or 'elsewhere' (a newer tab with the same
// pid joined), reports a fatal error to onPeers/onConnection
room.selfId            // string, stable per tab for the life of the page
room.presence(patch)   // Promise<void>; shallow-merges patch into my presence (value null deletes key) and broadcasts
room.peers()           // frozen array of entries
room.onPeers(handler, onError) // handler({ peers, joined, left, updated }); called once soon after subscribe with all current peers in `joined` (me included), then on remote changes only: my own presence() updates show in peers() but don't call it. returns unsubscribe
room.onConnection(handler, onError) // handler(connected: boolean). returns unsubscribe
room.send(msg)         // reliable, ordered JSON message to every OTHER tab (relayed by the server; held while reconnecting)
room.onMessage(handler) // handler(msg, fromId). returns unsubscribe
room.onReplacing(h)    // server-only {label, seconds}; late joins get remainder; returns unsubscribe
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

The room id comes from the effective page flags (`src/proto/flags.ts`): the bare URL and headless tools open the current game in `boogle`, and explicit prototypes retain their rooms. An explicit `?room=` wins, sanitized to `[a-z0-9-]{1,32}`.

During development every client is assumed current. There is no catalog fingerprint or old-build admission fence;
wire/save reshapes use the dated `WORLD_NS` reset described in [mixed builds](../../docs/agents/mixed-builds.md).
The server validates all messages and bounds input. Railway commands use ordered `r:*` requests and `s` packets;
the only remaining `w:*` message is the server-origin `w:c` clock. Client-origin legacy or malformed `w:*` data
is ignored or refused without entering simulation. Clients mirror state and never persist server checkpoints.
The existing room namespace admission refuses a v40 client at v41; no migration or alternate transport is retained.
Shared tuning writes require an explicit server `TUNE_CONTROLLER_KEY` matching the sender's bound socket key,
a current revision and valid values; being the room lead grants nothing.
