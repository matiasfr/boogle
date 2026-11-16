// Secret-free probe surface except the explicit PIN handoff, kept only in runner memory.
import * as account from '../../src/player/account.ts';
import { createWsRoom, type Room } from '../../src/net/ws-room.ts';

let room: Room | undefined;
const query = new URLSearchParams(location.search);
window.T = {
  fatal: '',
  async start() {
    await account.prepareAccount();
    try {
      room = await createWsRoom({
        server: query.get('server')!,
        roomId: query.get('room')!,
        authenticate: () => account.roomAuthentication(),
        build: 'account-browser-proof',
      });
      room.onConnection(
        () => {},
        (error) => {
          window.T.fatal = error.code;
        },
      );
      account.onAccountReload(() => room?.close());
      return room.selfId;
    } catch (error) {
      return { error: (error as { code?: string }).code };
    }
  },
  status: account.accountStatus,
  savePin: account.saveAccountPin,
  signIn: account.signInAccount,
  signOut: account.signOutAccount,
};
