# Many meshes, lights or post passes; count diagnostics

- `npm run perf`: before/after adding many meshes, lights or post passes. Not for UI, tuning or a single prop. Its numbers mean something only while no other agent is rendering on the same machine.
- `npm run counts`: draw calls, shadow draws, programs and first-load gzip as JSON; `counts-nightly.yml` keeps one a night from SwiftShader. Counts only: no times, no budget yet.
