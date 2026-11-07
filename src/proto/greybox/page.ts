// The map page's data, read at build time from the page itself: the 2D layouts and this greybox share one source.
import html from '../../../docs/world/map-prototypes.html?raw';
import { parseMapPage } from './map-data.ts';

export const MAP = parseMapPage(html);
