// Existing debug delivery fills the active bill, then actual feed/lay code runs unchanged.
const place = window.__place as { skipDelivery(): void; coop: { skip(name: string, fn: () => void): void } };
if (new URLSearchParams(location.search).get('coop') === '1') place.coop.skip('delivery', place.skipDelivery);
else place.skipDelivery();
export {};
