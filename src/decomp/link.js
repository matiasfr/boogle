// A file the player brings, fetched from a link they paste (their own private copy, e.g. a Dropbox share) instead of
// dropped in. The link is used once and not kept; the file then goes into store.js like a dropped one.

// A Dropbox share page (www.dropbox.com/scl/fi/...?rlkey=...&dl=0) as the direct download, which also allows a fetch
// from another site. Other links are left as they are.
export function directLink(text) {
  let url;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (/^(www\.)?dropbox\.com$/.test(url.hostname)) {
    url.hostname = 'dl.dropboxusercontent.com';
    url.searchParams.delete('dl');
    url.searchParams.delete('raw');
  }
  return url.href;
}

// The file named after the last part of the link's path, or null if it can't be fetched (offline, no such file, or a
// host that doesn't let other sites download).
export async function fetchLinkedFile(href) {
  try {
    const res = await fetch(href);
    if (!res.ok) return null;
    const name = decodeURIComponent(new URL(href).pathname.split('/').pop() || 'file');
    return new File([await res.blob()], name);
  } catch {
    return null;
  }
}
