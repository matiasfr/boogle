// Import maps resolve old harness source IDs even in page.evaluate/CDP and nested dynamic imports.
// This module is a dependency of the opt-in debug camera only; it imports no game or bot modules.
import imports from 'virtual:harness-imports';

if (imports) {
  const map = document.createElement('script');
  map.type = 'importmap';
  map.textContent = JSON.stringify({ imports });
  document.head.append(map);
}
