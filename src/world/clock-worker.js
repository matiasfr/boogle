// Dedicated worker: a steady heartbeat for the world tick while the tab is hidden (worker timers are not throttled like page timers).
setInterval(() => postMessage(0), 50);
