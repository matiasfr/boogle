// Text a browser sent, made safe to store and print: control characters (terminal escapes, newlines that could forge a
// line of a summary), line separators and bidi overrides become a space. Import-free: the server and dev/playtest/ share it.
// eslint-disable-next-line no-control-regex, no-misleading-character-class -- control characters are the point
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/g;
export const cleanText = (s: string) => s.replace(CONTROL, ' ');
