const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
background((window as unknown as { __gpuJump: () => Promise<void> }).__gpuJump(), 'GPU jump probe');
export {};
