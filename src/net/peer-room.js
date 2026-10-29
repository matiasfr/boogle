// STUB — replaced by the real PeerJS implementation
//
// Solo-only room that implements the interface documented in ./README.md without touching the network.
// It reports itself as the only peer and as connected, so the game runs normally on an empty island.

function randomId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createPeerRoom({ roomId } = {}) {
  void roomId;
  const selfId = randomId();
  let mine = {};
  let closed = false;
  const peerHandlers = new Set();
  const connHandlers = new Set();
  const messageHandlers = new Set();
  const hostHandlers = new Set();

  const makeEntry = () =>
    Object.freeze({ peer: selfId, sameTab: true, presence: Object.freeze({ ...mine }), updatedAt: Date.now() });
  let entry = makeEntry();
  const snapshot = () => Object.freeze([entry]);

  return {
    selfId,
    presence(patch) {
      mine = { ...mine };
      for (const [k, v] of Object.entries(patch || {})) {
        if (v === null) delete mine[k];
        else mine[k] = v;
      }
      entry = makeEntry();
      if (!closed) {
        const change = { peers: snapshot(), joined: [], left: [], updated: [entry] };
        queueMicrotask(() => peerHandlers.forEach((h) => h(change)));
      }
      return Promise.resolve();
    },
    peers: snapshot,
    onPeers(handler) {
      peerHandlers.add(handler);
      setTimeout(() => {
        if (peerHandlers.has(handler)) handler({ peers: snapshot(), joined: [entry], left: [], updated: [] });
      }, 0);
      return () => peerHandlers.delete(handler);
    },
    onConnection(handler) {
      connHandlers.add(handler);
      setTimeout(() => {
        if (connHandlers.has(handler)) handler(true);
      }, 0);
      return () => connHandlers.delete(handler);
    },
    send() {},
    onMessage(handler) {
      messageHandlers.add(handler);
      return () => messageHandlers.delete(handler);
    },
    isHost: () => true,
    onHostChange(handler) {
      hostHandlers.add(handler);
      return () => hostHandlers.delete(handler);
    },
    close() {
      closed = true;
      peerHandlers.clear();
      connHandlers.clear();
      messageHandlers.clear();
      hostHandlers.clear();
    },
  };
}
