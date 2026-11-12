// npm run look -- --real --rail-seed q4-done --query 'gpuProfile=portable&gpuShot=jump&dev=1&graphics=msaa:false' --eval dev/look/evals/gpu-portability.ts --action dev/look/evals/gpu-portability-action.ts --warm 0 --name portable-jump --frames 12 --seconds 0.8 --video --curves
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
background((window as unknown as { __gpuJump: () => Promise<void> }).__gpuJump(), 'GPU jump probe');
export {};
