// Prototype: laying-run variants, behind `?room=proto-lay&proto=lay&v=crawl|quick|push` (docs/game-design/haul.md,
// "Machine runs"). The panel (src/proto/lay/) loads only with the flag, so without it nothing changes.
if (new URLSearchParams(location.search).get('proto') === 'lay') import('../proto/lay/index.ts');
