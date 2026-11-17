# Earlier failures and recovered harness errors

Full failing-test blocks and failed capture transcripts. No thresholds were loosened.

## pier-tests-before-fixture.log

```text
✖ failing tests:

test at test/prefab-halts.test.ts:37:1
✖ halt kit placements, colliders, lever plaques and ordered prompts match the committed catalog stage (35957.34875ms)
  AssertionError [ERR_ASSERTION]: halts.boxValues[0][67].x: 1396.3139125349994 != 1396.2483470760048
      at prefabGolden (file:///Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/test/helpers/prefab-golden.ts:14:14)
      at prefabGolden (file:///Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/test/helpers/prefab-golden.ts:28:7)
      at file:///Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/test/helpers/prefab-golden.ts:22:30
      at Array.forEach (<anonymous>)
      at prefabGolden (file:///Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/test/helpers/prefab-golden.ts:22:12)
      at file:///Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/test/helpers/prefab-golden.ts:22:30
      at Array.forEach (<anonymous>)
      at prefabGolden (file:///Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/test/helpers/prefab-golden.ts:22:12)
      at prefabGolden (file:///Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/test/helpers/prefab-golden.ts:28:7)
      at TestContext.<anonymous> (file:///Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/test/prefab-halts.test.ts:303:3) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }
unit shard 1/1: 37.4s
```

## pier-tests-filter-failure.log

```text
Could not find 'test/prefab-halts.test.ts,test/train-wheel-rail.test.ts,test/railway-running-side.test.ts,test/railway-r4b-views.test.ts'
unit shard 1/1: 0.0s
```

## check-before-map.log

```text
✖ failing tests:

test at test/rail-map.test.ts:6:1
✖ the rail map is current with the rail data (1481.188416ms)
  Error: Command failed: /Users/matiasfranco/.nvm/versions/node/v26.13.0/bin/node --import ./dev/sim/hooks.ts dev/level/rail-map.ts --check
      at genericNodeError (node:internal/errors:999:15)
      at wrappedFn (node:internal/errors:544:14)
      at checkExecSyncError (node:child_process:990:11)
      at execFileSync (node:child_process:1026:15)
      at TestContext.<anonymous> (file:///Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/test/rail-map.test.ts:8:3)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.start (node:internal/test_runner/test:1262:17)
      at startSubtestAfterBootstrap (node:internal/test_runner/harness:387:17) {
    status: 1,
    signal: null,
    output: [ null, <Buffer 73 74 61 6c 65 3a 20 64 6f 63 73 2f 77 6f 72 6c 64 2f 72 61 69 6c 2d 6d 61 70 2e 68 74 6d 6c 20 28 6e 6f 64 65 20 2d 2d 69 6d 70 6f 72 74 20 2e 2f 64 ... 39 more bytes>, <Buffer > ],
    pid: 20869,
    stdout: <Buffer 73 74 61 6c 65 3a 20 64 6f 63 73 2f 77 6f 72 6c 64 2f 72 61 69 6c 2d 6d 61 70 2e 68 74 6d 6c 20 28 6e 6f 64 65 20 2d 2d 69 6d 70 6f 72 74 20 2e 2f 64 ... 39 more bytes>,
    stderr: <Buffer >
  }
unit shard 1/1: 179.9s
```

## before-east-relative-root-failure.log

```text
Error: vite did not start: node:internal/modules/cjs/loader:1607
  throw err;
  ^

Error: Cannot find module '/Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/.look/rider-coach-r2b1/baseline/.look/rider-coach-r2b1/baseline/node_modules/vite/bin/vite.js'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1603:15)
    at wrapResolveFilename (node:internal/modules/cjs/loader:1145:27)
    at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1169:10)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1196:12)
    at Module._load (node:internal/modules/cjs/loader:1370:5)
    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
    at node:internal/main/run_main_module:33:47 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v26.13.0
    at startStack (file:///Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/lib.ts:129:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async file:///Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/look.ts:284:11
verdict: failure on 5243d3dd, load ? → 20.82, 2026-11-17T02:24:22.400Z to 2026-11-17T02:24:22.650Z
```

## before-long-staging-failure.log

```text
bot queue: queued behind t3-6a1cc403-f0af1001cb859586: /Users/matiasfranco/.t3/worktrees/boogle/t3-6a1cc403-f0af1001cb859586/dev/look/rider-coach-proof.ts curve (pid 11040)
bot queue: acquired t3-b6310eac-63a166c3506c3ec2: /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/look.ts --root /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/.look/rider-coach-r2b1/baseline --rail-seed boiler-long --query debugcam=1&pierShot=long --eval .look/rider-coach-r2b1/views.ts --until window.__pierShotReady --warm 2400 --seconds 1 --frames 2 --size 1280x900 --out .look/rider-coach-r2b1/before --name long --question Fixed Pier long before R2b.1; waited 42.28s
[player] entry: clicked Jump in
[player] renderer backend: webgpu
question: Fixed Pier long before R2b.1
view: {"cam":[-10,12,-14],"look":[-22,3.5,-21]}
action: none (observe only)
(node:11733) ExperimentalWarning: stripTypeScriptTypes is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PLAY 0.2 (+0.2) NEVER: the game offered request homeward; it offers Request stop: to Village, 0.5 m off
page.evaluate: Error: requested consist never stood
    at eval (eval at evaluate (:370:30), <anonymous>:40:24)
    at async <anonymous>:396:30
    at Game.eval (/Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/lib.ts:394:22)
    at pageScript (/Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/look.ts:279:23)
    at /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/look.ts:349:24 {
  log: []
}
verdict: failure on 5243d3dd + 10 uncommitted, load 5.81 → 9.97, queued 42 s, 2026-11-17T02:28:34.043Z to 2026-11-17T02:30:11.870Z
bot queue: released t3-b6310eac-63a166c3506c3ec2: /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/look.ts --root /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/.look/rider-coach-r2b1/baseline --rail-seed boiler-long --query debugcam=1&pierShot=long --eval .look/rider-coach-r2b1/views.ts --until window.__pierShotReady --warm 2400 --seconds 1 --frames 2 --size 1280x900 --out .look/rider-coach-r2b1/before --name long --question Fixed Pier long before R2b.1
```

## before-long.log

```text
bot queue: queued behind t3-6a1cc403-f0af1001cb859586: /Users/matiasfranco/.t3/worktrees/boogle/t3-6a1cc403-f0af1001cb859586/dev/look/rider-coach-proof.ts gorge (pid 12037), t3-6a1cc403-f0af1001cb859586: /Users/matiasfranco/.t3/worktrees/boogle/t3-6a1cc403-f0af1001cb859586/.look/rider-coach-r2b/finish/roof-probe.ts (pid 13519)
bot queue: queued behind t3-6a1cc403-f0af1001cb859586: /Users/matiasfranco/.t3/worktrees/boogle/t3-6a1cc403-f0af1001cb859586/dev/look/rider-coach-proof.ts gorge (pid 12037)
bot queue: acquired t3-b6310eac-63a166c3506c3ec2: /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/look.ts --root /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/.look/rider-coach-r2b1/baseline --rail-seed boiler-long --query debugcam=1&pierShot=long --eval .look/rider-coach-r2b1/views.ts --until window.__pierShotReady --warm 2400 --seconds 1 --frames 2 --size 1280x900 --out .look/rider-coach-r2b1/before --name long --question Longest current train standing homeward and the old crossing; waited 99.49s; shared
[player] entry: clicked Jump in
[player] renderer backend: webgpu
question: Longest current train standing homeward and the old crossing
view: {"cam":[-10,12,-14],"look":[-22,3.5,-21]}
action: none (observe only)
(node:13686) ExperimentalWarning: stripTypeScriptTypes is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PLAY 90.0 (+90.0) NEVER: request accepted
page.evaluate: Error: request not accepted
    at eval (eval at evaluate (:370:30), <anonymous>:42:92)
    at async <anonymous>:396:30
    at Game.eval (/Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/lib.ts:394:22)
    at pageScript (/Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/look.ts:279:23)
    at /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/look.ts:349:24 {
  log: []
}
verdict: failure on 5243d3dd + 10 uncommitted, load 11.23 → 13.52, queued 99 s, shared the machine with another run, 2026-11-17T02:31:09.294Z to 2026-11-17T02:33:51.813Z
bot queue: released t3-b6310eac-63a166c3506c3ec2: /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/look.ts --root /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/.look/rider-coach-r2b1/baseline --rail-seed boiler-long --query debugcam=1&pierShot=long --eval .look/rider-coach-r2b1/views.ts --until window.__pierShotReady --warm 2400 --seconds 1 --frames 2 --size 1280x900 --out .look/rider-coach-r2b1/before --name long --question Longest current train standing homeward and the old crossing
```

## before-long-retry.log

```text
bot queue: acquired t3-b6310eac-63a166c3506c3ec2: /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/look.ts --root /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/.look/rider-coach-r2b1/baseline --rail-seed boiler-long --query debugcam=1&pierShot=long --eval .look/rider-coach-r2b1/views.ts --until window.__pierShotReady --warm 2400 --wall 1200 --seconds 1 --frames 2 --size 1280x900 --out .look/rider-coach-r2b1/before --name long --question Longest current train standing homeward, old crossing; waited 0.51s; shared
[player] entry: clicked Jump in
[player] renderer backend: webgpu
question: Longest current train standing homeward, old crossing
view: {"cam":[-10,12,-14],"look":[-22,3.5,-21]}
action: none (observe only)
(node:17270) ExperimentalWarning: stripTypeScriptTypes is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
SIGTERM: the run was stopped from outside; its verdict is "killed"
verdict: killed on 5243d3dd + 12 uncommitted, load 9.99 → 23.04, queued 1 s, shared the machine with another run, 2026-11-17T02:36:31.014Z to 2026-11-17T02:40:20.175Z
page.evaluate: Target page, context or browser has been closed
    at Game.eval (/Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/lib.ts:394:22)
    at pageScript (/Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/look.ts:279:23)
    at /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/look.ts:349:24 {
  log: []
}
verdict: killed on 5243d3dd + 12 uncommitted, load 9.99 → 23.04, queued 1 s, shared the machine with another run, 2026-11-17T02:36:31.014Z to 2026-11-17T02:40:20.187Z
bot queue: released t3-b6310eac-63a166c3506c3ec2: /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/look/look.ts --root /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/.look/rider-coach-r2b1/baseline --rail-seed boiler-long --query debugcam=1&pierShot=long --eval .look/rider-coach-r2b1/views.ts --until window.__pierShotReady --warm 2400 --wall 1200 --seconds 1 --frames 2 --size 1280x900 --out .look/rider-coach-r2b1/before --name long --question Longest current train standing homeward, old crossing
```
