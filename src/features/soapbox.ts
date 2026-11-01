// Prototype: the soapbox cart down the lighthouse path, behind `?proto=soapbox` (docs/game-design/soapbox.md). The
// cart, its sync and its run load only with the flag (src/proto/soapbox/), so without it nothing changes.
if (new URLSearchParams(location.search).get('proto') === 'soapbox') import('../proto/soapbox/index.ts');
