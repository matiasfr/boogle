// Load only the requested page: retained review links do not need the catalog or its heat-map image.
import './protos.css';

const reviewId = new URLSearchParams(location.search).get('review');
if (reviewId) await (await import('./review.ts')).showReview(reviewId);
else await import('./catalog.ts');
