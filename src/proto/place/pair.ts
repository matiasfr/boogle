// Co-operative cart interactions, available only in the two-player prototype.
import * as THREE from 'three/webgpu';
import { registerInteractable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { whistle } from '../../render/machine-sfx.ts';
import { coop, pairHook } from './coop.ts';
import { callCart, cart, cartHere, loadCart, rack } from './depot.ts';
import { forge, rackTop, takeRail } from './forge.ts';
import { COOP, count, job } from './job.ts';
import { CART } from './layout.ts';
import { TX, TY, TZ } from './lines.ts';
import { send } from './pieces.ts';
import { activeFrame } from './run.ts';

const at = new THREE.Vector3(TX, TY + 2, TZ);
const from = new THREE.Vector3();
if (COOP) {
  pairHook.msg = (m) => {
    if (m.k === 'cartCall') callCart();
    else if (m.k === 'cartLoad' && count(m.n, CART.rails)) loadCart(m.n);
  };
  registerInteractable(() => {
    const p = me.body?.interpolatedPosition;
    const st = activeFrame();
    if (!p || !job.rung.depot || job.rung.trains || st?.spec.rack !== 'cart' || Math.hypot(p.x - TX, p.z - TZ) > 5)
      return [];
    const need = st.wants('rails') - rack.rails - cart.rails;
    if (need <= 0) return [];
    const n = Math.min(need, CART.rails - cart.rails, forge.rails);
    if (cart.leg === 'forge' && n > 0)
      return [
        {
          id: 'place-cart-load',
          verb: 'Load the cart',
          at,
          run: () => {
            const here = cartHere();
            for (let k = 0; k < n; k++) {
              rackTop(forge.rails, from);
              takeRail();
              send('rail', from, new THREE.Vector3(here.x, TY + CART.top + 0.5, here.z), {
                dur: 0.45,
                delay: k * 0.06,
                apex: 1.1,
              });
            }
            loadCart(n);
            coop.took('rails', n);
            coop.send({ k: 'cartLoad', n });
          },
        },
      ];
    if (!cart.called)
      return [
        {
          id: 'place-cart-call',
          verb: 'Whistle for the cart',
          at,
          run: () => {
            whistle(TX, TZ);
            callCart();
            coop.send({ k: 'cartCall' });
          },
        },
      ];
    return [];
  });
}
