import test from 'node:test';
import assert from 'node:assert/strict';
import { nagaUnsafeCalls, wgslPortabilityScript } from '../dev/look/wgsl-portability.ts';

test('flags the literal-only calls Firefox refused on 10 November', () => {
  const sea = 'let nodeConst13 = mix( 1.0, 0.62, 1.0 );\nlet a = 1.0;';
  assert.deepEqual(nagaUnsafeCalls(sea), ['1: mix( 1.0, 0.62, 1.0 )']);
  const cove = 'x\n\tlet nodeConst46 = mix( 0.93, 0.93, 1.0 );';
  assert.deepEqual(nagaUnsafeCalls(cove), ['2: mix( 0.93, 0.93, 1.0 )']);
  assert.equal(nagaUnsafeCalls('smoothstep( ( 0.5 - 0.3 ), max( 0.5, 0.8 ), 0.2 )').length, 1);
  assert.equal(nagaUnsafeCalls('dot( 1.0, -2.0 )').length, 1);
});

test('passes calls with any concrete argument', () => {
  for (const ok of [
    'mix( 1.0, 0.62, nodeVar1 )',
    'smoothstep( -0.05, 0.05, v_positionWorld.y )',
    'mix( vec3<f32>( 1.0 ), vec3<f32>( 0.0 ), 0.5 )',
    'dot( nodeVar2, vec3<f32>( 0.3, 0.6, 0.1 ) )',
    'max( 1.0, 2.0 )',
    'clamp( 2.0, 0.0, 1.0 )',
    'textureSample( t, s, uv )',
  ])
    assert.deepEqual(nagaUnsafeCalls(ok), [], ok);
});

test('the page script reports an offending module and still creates it', () => {
  const logged: string[] = [];
  const made: string[] = [];
  class GPUDevice {
    createShaderModule(desc: { label: string; code: string }) {
      made.push(desc.label);
      return {};
    }
  }
  new Function('GPUDevice', 'console', 'globalThis', wgslPortabilityScript)(
    GPUDevice,
    { error: (m: string) => logged.push(m) },
    { GPUDevice },
  );
  const device = new GPUDevice();
  device.createShaderModule({ label: 'fragment_sea', code: 'let a = mix( 1.0, 0.62, 1.0 );' });
  device.createShaderModule({ label: 'fine', code: 'let a = mix( 1.0, 0.62, x );' });
  assert.deepEqual(made, ['fragment_sea', 'fine']);
  assert.equal(logged.length, 1);
  assert.match(logged[0]!, /^THREE\.WGSL portability: fragment_sea .*mix\( 1\.0, 0\.62, 1\.0 \)/);
});

test('a nested literal-only call is found inside a concrete one', () => {
  assert.deepEqual(nagaUnsafeCalls('mix( mix( 1.0, 2.0, 0.5 ), x, y )'), ['1: mix( 1.0, 2.0, 0.5 )']);
});
