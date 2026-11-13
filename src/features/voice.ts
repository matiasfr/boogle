// Voice chat (docs/game-design/social.md, "Voice chat"): room-wide, opt-in. Off until the player presses Join voice in
// Pause (a real gesture: the mic prompt, and iOS lets media play while the mic is open). Then an audio-only WebRTC link
// to every other tab in voice, a peer-to-peer mesh (src/netplay/voice-mesh.ts), STUN only: no TURN, so a strict NAT or
// some cellular networks can't connect, and that peer shows "Can't connect" instead of hanging.
//   Presence `vc`: 1 in voice, 2 muted; missing means not in voice. Signals: room messages to one tab (src/net/rtc-wire.ts).
//   A tab that never presses the button opens no mic and no connection: nobody offers to a tab without `vc`.
//   Each remote voice plays from its own <audio> element; peerVolume() is the one volume point per peer (for a later
//   proximity fade). Remote talking dots read each link's inbound audio level from getStats, so remote voices never
//   touch WebAudio (Safari can silence an element whose stream also feeds the context); only your own mic is metered
//   on the game's context, and nothing of voice ever reaches its speakers.
import './voice.css';
import { net, remotes, addPresenceField, keepPresenceWhile, onRemotePresence, onPeerRemoved } from '../netplay/net.ts';
import { onNetState, sendPresence } from '../netplay/net.ts';
import { createVoiceMesh, type PeerLink, type VoiceMesh } from '../netplay/voice-mesh.ts';
import { validateRtc, type RtcIce } from '../net/rtc-wire.ts';
import type { Room } from '../net/ws-room.ts';
import { pauseSections } from '../player/pause-pages.ts';
import { meterContext, micSession } from '../render/audio.ts';
import { onStart } from '../loop.ts';
import { registerAction } from '../player/controls.ts';
import { glyph, inputKind } from '../player/glyphs.ts';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
];
const TALK_RMS = 0.02; // a meter above this reads as talking
const MIC = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

type Voice = { pc: RTCPeerConnection; audio: HTMLAudioElement; level: number; stream: MediaStream | null };
type Meter = { src: MediaStreamAudioSourceNode; an: AnalyserNode; buf: Float32Array<ArrayBuffer> };

let mic: MediaStream | null = null;
let myMeter: Meter | null = null;
let joined = false,
  joining = false,
  muted = false,
  problem = ''; // why joining failed: shown in Pause
let mesh: VoiceMesh | null = null;
let boundRoom: Room | null = null;
let tickTimer: ReturnType<typeof setInterval> | 0 = 0;
const voices = new Map<string, Voice>();
const inVoice = new Map<string, number>(); // peer -> their presence vc (1 talking allowed, 2 muted)

// ---------------------------------------------------------------- audio
function meter(stream: MediaStream): Meter | null {
  const ctx = meterContext();
  if (!ctx) return null;
  try {
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an); // never on to the speakers: the <audio> element plays the voice
    return { src, an, buf: new Float32Array(an.fftSize) };
  } catch {
    return null;
  }
}
function level(m: Meter | null) {
  if (!m) return 0;
  m.an.getFloatTimeDomainData(m.buf);
  let s = 0;
  for (const v of m.buf) s += v * v;
  return Math.sqrt(s / m.buf.length);
}
const unmeter = (m: Meter | null) => {
  try {
    m?.src.disconnect();
  } catch {
    // already gone
  }
};
/** The one volume point for a peer's voice (0..1). iOS Safari ignores element volume; see the design doc. */
function peerVolume(peer: string, v: number) {
  const voice = voices.get(peer);
  if (voice) voice.audio.volume = Math.max(0, Math.min(1, v));
}
function play(audio: HTMLAudioElement) {
  audio.play().catch(() => {}); // refused without a gesture: replayAll() on the next press
}
const replayAll = () => {
  for (const v of voices.values()) if (v.audio.paused && v.audio.srcObject) play(v.audio);
};

// ---------------------------------------------------------------- links
function open(peer: string, onIce: (c: RtcIce | null) => void, onState: (s: 'connected' | 'failed') => void): PeerLink {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const audio = document.createElement('audio');
  audio.autoplay = true;
  audio.setAttribute('playsinline', '');
  audio.className = 'voice-audio';
  document.body.append(audio);
  const voice: Voice = { pc, audio, level: 0, stream: null };
  voices.set(peer, voice); // the mesh closed any older link to this peer first
  peerVolume(peer, 1);
  if (mic) for (const t of mic.getTracks()) pc.addTrack(t, mic);
  pc.onicecandidate = (e) =>
    onIce(
      e.candidate
        ? { candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex }
        : null,
    );
  const state = () => {
    const s = pc.connectionState ?? pc.iceConnectionState;
    if (s === 'connected' || pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed')
      onState('connected');
    else if (s === 'failed' || pc.iceConnectionState === 'failed') onState('failed');
    refresh();
  };
  pc.onconnectionstatechange = state;
  pc.oniceconnectionstatechange = state;
  pc.ontrack = (e) => {
    const stream = e.streams[0] ?? new MediaStream([e.track]);
    if (voice.stream === stream) return;
    voice.stream = stream;
    audio.srcObject = stream;
    play(audio);
  };
  return {
    async makeOffer() {
      await pc.setLocalDescription(await pc.createOffer());
      return pc.localDescription!.sdp;
    },
    async takeOffer(sdp) {
      await pc.setRemoteDescription({ type: 'offer', sdp });
      await pc.setLocalDescription(await pc.createAnswer());
      return pc.localDescription!.sdp;
    },
    async takeAnswer(sdp) {
      await pc.setRemoteDescription({ type: 'answer', sdp });
    },
    async addIce(c) {
      if (c) await pc.addIceCandidate(c);
    },
    close() {
      pc.close();
      audio.srcObject = null;
      audio.remove();
      if (voices.get(peer) === voice) voices.delete(peer);
      refresh();
    },
  };
}

function members() {
  return [...inVoice.keys()].filter((p) => remotes.has(p));
}
function bindRoom() {
  const room = net.room;
  if (!room || room === boundRoom) return;
  boundRoom = room;
  room.onMessage((msg, from) => {
    if (room !== net.room || !mesh) return;
    const signal = validateRtc(msg);
    if (signal) mesh.hear(signal, from);
  });
  mesh?.leave();
  mesh = createVoiceMesh({
    self: room.selfId,
    send: (m) => net.room === room && room.send(m),
    open,
    now: () => performance.now(),
    onChange: refresh,
  });
  mesh.setMembers(members());
  if (joined) mesh.join();
}

// ---------------------------------------------------------------- join, mute, leave
async function join() {
  if (joined || joining) return;
  if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
    problem = 'No microphone';
    return refresh();
  }
  joining = true;
  problem = '';
  refresh();
  micSession(true);
  try {
    mic = await navigator.mediaDevices.getUserMedia({ audio: MIC, video: false });
  } catch (e) {
    micSession(false);
    joining = false;
    problem = (e as Error)?.name === 'NotAllowedError' ? 'Mic blocked' : 'No microphone';
    return refresh();
  }
  micSession(true); // the mic may have interrupted the game's sound on iOS
  joining = false;
  joined = true;
  muted = false;
  myMeter = meter(mic);
  // The mic can end under us (iOS backgrounding, a device unplugged): leave voice rather than look in voice while
  // silent. Join voice again acquires a fresh mic.
  for (const t of mic.getAudioTracks())
    t.addEventListener('ended', () => {
      if (!joined || mic?.getAudioTracks().some((x) => x.readyState === 'live')) return;
      leave();
      problem = 'Mic stopped';
      refresh();
    });
  bindRoom();
  mesh?.join();
  tickTimer ||= setInterval(tick, 200);
  sendPresence();
  refresh();
}
function setMute(on: boolean) {
  muted = on;
  for (const t of mic?.getAudioTracks() ?? []) t.enabled = !on;
  sendPresence();
  refresh();
}
function leave() {
  if (!joined) return;
  joined = false;
  mesh?.leave();
  for (const v of [...voices.values()]) v.pc.close();
  voices.clear();
  unmeter(myMeter);
  myMeter = null;
  for (const t of mic?.getTracks() ?? []) t.stop();
  mic = null;
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = 0;
  micSession(false);
  sendPresence();
  refresh();
}
function tick() {
  bindRoom();
  mesh?.tick();
  for (const v of voices.values())
    v.pc.getStats().then(
      (stats) =>
        stats.forEach((s: { type: string; kind?: string; audioLevel?: number }) => {
          if (s.type === 'inbound-rtp' && s.kind === 'audio') v.level = s.audioLevel ?? 0;
        }),
      () => {},
    );
  refresh();
}

// ---------------------------------------------------------------- presence
addPresenceField('vc', () => (joined ? (muted ? 2 : 1) : null));
keepPresenceWhile(() => joined);
onRemotePresence((r, pr) => {
  const vc = pr.vc === 1 || pr.vc === 2 ? pr.vc : 0;
  if (vc === (inVoice.get(r.peer) ?? 0)) return;
  if (vc) inVoice.set(r.peer, vc);
  else inVoice.delete(r.peer);
  mesh?.setMembers(members());
  refresh();
});
onPeerRemoved((r) => {
  inVoice.delete(r.peer);
  mesh?.setMembers(members());
  refresh();
});
onNetState((state) => {
  if (state === 'solo') {
    mesh?.leave(); // a new room makes a new mesh; we stay joined and reconnect to whoever is there
    mesh = null;
    boundRoom = null;
  } else bindRoom();
  refresh();
});
addEventListener('pagehide', leave);

// ---------------------------------------------------------------- UI: a row in Pause, a pill in the HUD corner
const row = document.createElement('div');
row.className = 'voice-row';
const head = document.createElement('div');
head.className = 'voice-head';
const label = document.createElement('span');
label.className = 'voice-label';
label.textContent = 'Voice chat';
const joinBtn = btn('Join voice', () => void join());
const muteBtn = btn('Mute', () => setMute(!muted));
const leaveBtn = btn('Leave voice', leave);
head.append(label, joinBtn, muteBtn, leaveBtn);
const who = document.createElement('div');
who.className = 'voice-who';
const hint = document.createElement('p'); // "V mutes" (D-pad ↓ on a pad): the key works during play; touch has the pill
hint.className = 'voice-hint';
row.append(head, who, hint);

const pill = document.createElement('button');
pill.type = 'button';
pill.className = 'voice-pill';
pill.setAttribute('aria-label', 'Mute');
pill.addEventListener('click', () => (replayAll(), setMute(!muted)));

function btn(text: string, fn: () => void) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pause-btn voice-btn';
  b.textContent = text;
  b.addEventListener('click', () => (replayAll(), fn()));
  return b;
}
const micSvg = (struck: boolean) =>
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/>' +
  '<path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none"/>' +
  (struck ? '<path class="voice-strike" d="M4 3 20 21" fill="none"/>' : '') +
  '</svg>';
let key = '';
function refresh() {
  const links = mesh?.links();
  type Who = { name: string; state: string };
  const list: Who[] = [];
  if (joined) list.push({ name: 'You', state: muted ? 'muted' : level(myMeter) > TALK_RMS ? 'talking' : 'on' });
  for (const peer of members()) {
    const r = remotes.get(peer);
    const link = links?.get(peer)?.state;
    const muteOn = inVoice.get(peer) === 2;
    const state = !joined
      ? 'on'
      : link === 'failed'
        ? 'failed'
        : link !== 'connected'
          ? 'connecting'
          : muteOn
            ? 'muted'
            : (voices.get(peer)?.level ?? 0) > TALK_RMS
              ? 'talking'
              : 'on';
    list.push({ name: r?.name || 'Someone', state });
  }
  const kind = inputKind();
  const next = JSON.stringify([joined, joining, muted, problem, list, kind]);
  if (next === key) return;
  key = next;
  joinBtn.hidden = joined;
  joinBtn.disabled = joining;
  joinBtn.textContent = joining ? 'Connecting…' : 'Join voice';
  muteBtn.hidden = leaveBtn.hidden = !joined;
  muteBtn.textContent = muted ? 'Unmute' : 'Mute';
  pill.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  who.replaceChildren(
    ...(problem
      ? [Object.assign(document.createElement('span'), { className: 'voice-problem', textContent: problem })]
      : []),
    ...list.map((w) => {
      const s = document.createElement('span');
      s.className = 'voice-name';
      s.dataset.state = w.state;
      s.textContent = w.state === 'failed' ? `${w.name}: Can't connect` : w.name;
      return s;
    }),
  );
  const keyGlyph = joined && kind !== 'touch' ? glyph('voice-mute') : '';
  hint.innerHTML = keyGlyph ? `${keyGlyph} mutes` : '';
  hint.hidden = !keyGlyph;
  pill.hidden = !joined;
  pill.dataset.muted = muted ? '1' : '';
  const talking = list.filter((w) => w.state === 'talking').map((w) => w.name);
  pill.innerHTML = micSvg(muted);
  const text = document.createElement('span');
  text.className = 'voice-pill-text';
  const bad = list.some((w) => w.state === 'failed');
  text.textContent = talking.length ? talking.join(', ') : bad ? "Can't connect" : String(list.length);
  pill.append(text);
}

onStart(() => {
  // During play the pointer is locked, so Pause was the only way to mute: V (D-pad ↓ on a pad, free in play) flips it.
  // Off the guide: it does nothing until you join voice, and the Pause voice row names it while you are in.
  registerAction('voice-mute', {
    pad: 'down',
    key: 'KeyV',
    label: 'Mute voice',
    group: 'friends',
    guide: false,
    down: () => joined && setMute(!muted),
  });
  pauseSections.push(row);
  (document.querySelector('.hud-tr') ?? document.body).prepend(pill);
  bindRoom();
  refresh();
});

/** Tests and the voice proof (dev/look/evals/voice.ts): what this tab's voice is doing, with each link's inbound audio. */
export async function voiceProbe() {
  const peers = [];
  for (const [peer, v] of voices) {
    let audioLevel = 0,
      bytes = 0;
    try {
      const stats = await v.pc.getStats();
      stats.forEach((s: { type: string; kind?: string; audioLevel?: number; bytesReceived?: number }) => {
        if (s.type === 'inbound-rtp' && s.kind === 'audio') {
          audioLevel = s.audioLevel ?? 0;
          bytes = s.bytesReceived ?? 0;
        }
      });
    } catch {
      // closed meanwhile
    }
    peers.push({ peer, state: mesh?.links().get(peer)?.state ?? 'gone', pc: v.pc.connectionState, audioLevel, bytes });
  }
  const vc = Object.fromEntries(inVoice); // peer -> their presence vc (1 in voice, 2 muted)
  return { joined, muted, problem, self: net.room?.selfId ?? null, members: members(), vc, peers };
}
export const voiceLeave = leave;
