// WGSL that Chromium (Tint) and Safari accept but Firefox (naga) refuses: a builtin naga cannot evaluate at compile time,
// called with literal arguments only. TSL emits a JS number as an untyped literal (`1.0`), so `mix(1, 0.62, x)` with x a
// plain number off the tuning route becomes `mix( 1.0, 0.62, 1.0 )`, and naga fails the whole shader with "failed to
// convert expression to a concrete type" (the sea on Daniel's Firefox 159, 10 November). Checked against naga 25:
// these five fail; abs, clamp, max, min, pow, exp, sin, floor, fract, length, normalize, cross, reflect and select pass.
// One concrete argument (`vec2<f32>(...)`, a variable) is enough. src/render/reference/tsl.md has the rule.

/** The calls in `code` naga rejects because every argument is a literal, as `line: call`. Self-contained, so
 * `Game.open` can serialise it into the page: it may use no imports or outer names. */
export function nagaUnsafeCalls(code: string): string[] {
  const unsafe = ['mix', 'smoothstep', 'dot', 'atan2', 'determinant'];
  const foldable =
    /\b(abs|clamp|max|min|pow|exp|exp2|log|log2|sqrt|inverseSqrt|sin|cos|tan|floor|ceil|fract|round|trunc|sign|saturate|step|select|mix|smoothstep|dot|atan2)\s*\(/g;
  const found: string[] = [];
  const call = new RegExp(`\\b(${unsafe.join('|')})\\s*\\(`, 'g');
  for (let m = call.exec(code); m; m = call.exec(code)) {
    const open = m.index + m[0].length;
    let depth = 1,
      i = open;
    for (; i < code.length && depth > 0; i++) {
      if (code[i] === '(') depth++;
      else if (code[i] === ')') depth--;
    }
    const args = code.slice(open, i - 1);
    // Literal only: numbers, operators and other foldable builtins of literals, with no name or typed constructor left.
    const rest = args.replace(foldable, '(');
    if (/^[\d.eE+\-*/%(),\s]*$/.test(rest) && /\d/.test(rest)) {
      const line = code.slice(0, m.index).split('\n').length;
      found.push(`${line}: ${code.slice(m.index, i).trim()}`);
    }
  }
  return found;
}

/** Page init script: wraps createShaderModule and logs each offending module as a `THREE.` console error, which
 * `Game` already collects as a gfx error. */
export const wgslPortabilityScript = `(() => {
  const check = ${nagaUnsafeCalls.toString()};
  const proto = globalThis.GPUDevice && GPUDevice.prototype;
  if (!proto || !proto.createShaderModule) return;
  const original = proto.createShaderModule;
  proto.createShaderModule = function (desc) {
    const found = desc && typeof desc.code === 'string' ? check(desc.code) : [];
    if (found.length)
      console.error('THREE.WGSL portability: ' + (desc.label || 'shader') + ' has a literal-only call Firefox refuses: ' + found.slice(0, 3).join('; '));
    return original.call(this, desc);
  };
})();`;
