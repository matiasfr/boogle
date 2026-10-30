# Networking

`peer-room.js` is the one module the game talks to for multiplayer. `src/netplay/net.js` (game-side presence, remotes and
interpolation) imports `createPeerRoom` from here and uses nothing else. It implements the host-peer design in
[PLAN.md](../../PLAN.md) ("Key decision"); message types and host migration are documented at the top of the file.
Changes must keep this interface; run `npm run test:net` after touching it.

```js
const room = await createPeerRoom({ roomId, signal /* optional {host,port,path,secure} */, iceServers /* optional */ });
room.selfId            // string, stable per tab for the life of the page (NOT the PeerJS id)
room.presence(patch)   // Promise<void>; shallow-merges patch into my presence (value null deletes key) and broadcasts
room.peers()           // frozen array of entries
room.onPeers(handler, onError) // handler({ peers, joined, left, updated }); called once soon after subscribe with all current peers in `joined`. returns unsubscribe
room.onConnection(handler, onError) // handler(connected: boolean). returns unsubscribe
room.send(msg)         // reliable, ordered JSON message to every OTHER peer (relayed through host)
room.onMessage(handler) // handler(msg, fromId). returns unsubscribe
room.isHost()          // boolean
room.onHostChange(handler) // handler(isHost: boolean). returns unsubscribe
room.close()
// peer entry: Object.freeze({ peer: string /*stable selfId of that tab*/, sameTab: boolean /*true for me*/, presence: object, updatedAt: number })
```

The game uses `entry.sameTab` to learn its own id (`net.myPeer = entry.peer`) and `entry.peer` for ball-ownership
tie-breaks, so `peer` must be the stable `selfId`, not the PeerJS id.

The room id comes from the page URL (`?room=beach`, default `beach`, sanitized to `[a-z0-9-]{1,32}`).

Messages are wire format shared with tabs on older builds: add new `t` types and fields, never change what an existing
one means (AGENTS.md, "Mixed builds").
