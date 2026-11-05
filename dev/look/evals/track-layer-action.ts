// Existing debug delivery fills the active bill, then actual feed/lay code runs unchanged.
const place = window.__place as { skipDelivery(): void };
place.skipDelivery();
export {};
