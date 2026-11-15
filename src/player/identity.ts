// The public pid owner. Boot verifies the device credential before main and identity-keyed caches load.
// A public pid alone cannot install a different identity; account switching is a later step.
import { accountPid } from './account.ts';
export { roomAuthentication } from './account.ts';

export type Identity = { readonly pid: string };
export const identity: Identity = {
  get pid() {
    return accountPid();
  },
};
