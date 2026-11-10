// Voice chat signalling (docs/game-design/social.md, "Voice chat"): the WebRTC offer, answer and ICE candidates two
// tabs trade to open an audio link. Each one is a room message { t:'rtc', to, k, n, ... } addressed to ONE other tab:
// the server relays it to `to` alone (server/src/host/hosted-room.ts), rate limited, and never into the world or a save.
// Pure; the server imports it too.
//   k 'offer' | 'answer'  sdp: the session description (at most RTC_SDP_MAX chars)
//   k 'ice'               c: one candidate { candidate, sdpMid, sdpMLineIndex } (null c: end of candidates)
//   k 'bye'               the sender closed its link to `to`
//   n                     the offerer's link number: an answer or candidate for an older link is ignored
export const RTC_TYPE = 'rtc';
export const RTC_SDP_MAX = 12000;
const CAND_MAX = 600;
const ID_MAX = 64;
const N_MAX = 1e9;

export type RtcIce = { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null };
export type RtcMsg =
  | { t: 'rtc'; to: string; k: 'offer' | 'answer'; n: number; sdp: string }
  | { t: 'rtc'; to: string; k: 'ice'; n: number; c: RtcIce | null }
  | { t: 'rtc'; to: string; k: 'bye'; n: number };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const shortStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;

/** A clean copy of a voice signal (only its own fields), or null when anything is out of shape or too big. */
export function validateRtc(d: unknown): RtcMsg | null {
  if (!isObj(d) || d.t !== RTC_TYPE || !shortStr(d.to, ID_MAX)) return null;
  const n = d.n;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0 || n > N_MAX) return null;
  const to = d.to;
  if (d.k === 'offer' || d.k === 'answer') {
    if (!shortStr(d.sdp, RTC_SDP_MAX)) return null;
    return { t: RTC_TYPE, to, k: d.k, n, sdp: d.sdp };
  }
  if (d.k === 'ice') {
    if (d.c === null) return { t: RTC_TYPE, to, k: 'ice', n, c: null };
    if (!isObj(d.c) || typeof d.c.candidate !== 'string' || d.c.candidate.length > CAND_MAX) return null;
    const mid = d.c.sdpMid ?? null;
    const line = d.c.sdpMLineIndex ?? null;
    if (mid !== null && !shortStr(mid, ID_MAX)) return null;
    if (line !== null && (typeof line !== 'number' || !Number.isInteger(line) || line < 0 || line > 15)) return null;
    return { t: RTC_TYPE, to, k: 'ice', n, c: { candidate: d.c.candidate, sdpMid: mid, sdpMLineIndex: line } };
  }
  if (d.k === 'bye') return { t: RTC_TYPE, to, k: 'bye', n };
  return null;
}
