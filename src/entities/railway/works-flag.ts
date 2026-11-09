/** Default-on dormant blockout; the only override is the before/after proof's off switch. */
export const worksPreview = () => new URLSearchParams(location.search).get('works') !== '0';
