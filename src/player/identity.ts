// The public pid owner. Boot verifies the device credential before main and identity-keyed caches load.
// A public pid alone cannot install a different identity. Account installation verifies a token and reloads.
import { accountPid } from './account.ts';
export { roomAuthentication } from './account.ts';

export type Identity = { readonly pid: string };
let pid: string | undefined;
export const identity: Identity = {
  get pid() {
    return (pid ??= accountPid());
  },
};
