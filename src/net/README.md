# Networking

`src/netplay/net.ts` uses only `ws-room.ts` for multiplayer: `createWsRoom({ roomId, server, authenticate, build, debug })`.
The server hosts every room (docs/plans/server-host.md), owns shared state and sends clock/replication `from`
`SERVER_ID` over one WebSocket per tab (`ws-wire.ts`). Every tab is a client; no tab is elected to compute shared state.
Rooms reconnect automatically (`ws-room.ts` header); `peer-table.ts` tracks peers. Keep this interface;
run `npm run test:net` after edits (`dev/peer-test/ws-run.ts` uses the real server).

## Room interface

```js
const room = await createWsRoom({
  roomId,
  server /* http(s) base */,
  authenticate /* () => ({ t: 'auth', token, tuneKey? }) */,
  build /* optional */,
  debug /* optional */,
});
// rejects with code 'room_full' (and `max`), 'peer_hosted' (a server not hosting this room), 'unreachable' or
// 'browser-incompatible'; after joining, a reconnect turned away as full, or 'elsewhere' (a newer tab with the same
// pid joined), reports a fatal error to onPeers/onConnection
room.selfId; // string, stable per tab for the life of the page
room.presence(patch); // Promise<void>; shallow-merges patch into my presence (value null deletes key) and broadcasts
room.peers(); // frozen array of entries
room.onPeers(handler, onError); // handler({ peers, joined, left, updated }); called once soon after subscribe with all current peers in `joined` (me included), then on remote changes only: my own presence() updates show in peers() but don't call it. returns unsubscribe
room.onConnection(handler, onError); // handler(connected: boolean). returns unsubscribe
room.send(msg); // reliable, ordered JSON message to every OTHER tab (relayed by the server; held while reconnecting)
room.onMessage(handler); // handler(msg, fromId). returns unsubscribe
room.onReplacing(h); // server-only {label, seconds}; late joins get remainder; returns unsubscribe
room.transport; // 'server'
room.linkStats(); // Promise<[{ peer: 'server', rttMs }]>: the heartbeat round trip
room.pause(ms); // tests: drop the socket as a network loss would, reconnects held for ms
room.close();
// peer entry: Object.freeze({ peer: string /*stable selfId of that tab*/, sameTab: boolean /*true for me*/, presence: object, updatedAt: number })
```

The game uses `entry.sameTab` to learn its own id (`net.myPeer = entry.peer`) and `entry.peer` for ball-ownership
tie-breaks, so `peer` must be the stable `selfId`.

## Room identity and admission

The room id comes from the effective page flags (`src/proto/flags.ts`): the bare URL and headless tools open the current game in `boogle`, and explicit prototypes retain their rooms. An explicit `?room=` wins, sanitized to `[a-z0-9-]{1,32}`.

During development every client is assumed current. There is no catalog fingerprint or old-build admission fence;
wire/save reshapes use the dated `WORLD_NS` reset described in [mixed builds](../../docs/agents/mixed-builds.md).
The server validates all messages and bounds input. Railway commands use ordered `r:*` requests and `s` packets;
the only remaining `w:*` message is the server-origin `w:c` clock. Client-origin legacy or malformed `w:*` data
is ignored or refused without entering simulation. Clients mirror state and never persist server checkpoints.
The socket URL contains only `self` and `b`; URL pid/key admission is refused. Its first frame is `account-wire.ts`'s
JSON auth frame (at most 1 KiB, within five seconds). No greeting, room load, presence or command delivery follows
until the durable account service verifies its device token and supplies the pid. The room binds that principal to
the connection, including commands; a frame's claimed pid grants nothing. Account IDs and credentials stay out of
room state, presence, replay and telemetry.

Different device tokens for one person share the same pid. The newer connection in a room retires the old one with
`elsewhere` (4010), which stops reconnecting. An ordinary reconnect of the same connection/principal is allowed,
including during grace; a different principal stealing that connection ID gets `taken` (4011). Rooms remain independent.
Revoked/expired sessions get `unauthenticated` (4401), which stops reconnecting without clearing the credential.
Authentication timeouts and account-store failures close with retryable 1012, not a fatal identity refusal.
PIN rotation detaches other sessions' live sockets; sign-out detaches its own, after the durable transaction commits.

Shared tuning writes require `tuneKey` in the auth frame to match the separately configured `TUNE_CONTROLLER_KEY`,
a current revision and valid values. Neither sign-in nor joining first grants that capability. `npm run tune --
--session --controller ...` reads it from `TUNE_CONTROLLER_KEY`; it never uses the account token as an operator key.

Accounts step 2 includes only the guest connection bootstrap: boot prepares `boogle.account` before main imports
identity-dependent caches. It saves a random token before registration and retains it on failure. Account UI,
switching/sign-out flows, richer offline recovery and identity-sensitive visit cleanup remain step 3/4 work.

Effective prototype pages retain their ordinary presence/message connection, but seats are Local and unarbitrated and each
tab runs its own Boogler. They do not use the production railway command boundary for those features.
The retired `?proto=place` alias remains the production game with Server authority.
