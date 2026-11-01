// The music prototype (docs/research/audio-and-music.md): behind ?proto=groove, an 8-bar house loop on a clock every
// tab shares, layered by what you're doing, with sound effects on its grid and in its key (src/proto/groove/, in its
// own chunk). The wagon comes along so riding has its own layer; lay sections with its panel. Without the flag nothing
// loads and the game is unchanged. Serves DESIGN.md 4 (Cooperation is automatic) and 10 (Slapstick over precision).
import { getRoomId } from '../netplay/net.ts';
import { isProtoRoom } from '../sim/tune.ts';

if (new URLSearchParams(location.search).get('proto') === 'groove') {
  void import('../proto/groove/index.ts');
  void import('../proto/wagon/index.ts').then((m) => m.wagonPanel(isProtoRoom(getRoomId())));
}
