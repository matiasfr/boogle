// Fault injection for accounts.test.ts: die inside a real SQLite transaction, without close/rollback handlers.
import { createAccountStore } from '../../src/account-store.ts';
import { createAccounts } from '../../src/accounts.ts';

const [dataDir, operation, token] = process.argv.slice(2);
if (!dataDir || !operation || !token) throw new Error('Missing crash fixture arguments');
const store = createAccountStore({ dataDir });
store.init();
const accounts = createAccounts(store);
const crash = () => process.kill(process.pid, 'SIGKILL');
if (operation === 'guest') {
  const addSession = store.addSession;
  store.addSession = (...args) => {
    addSession(...args);
    crash();
  };
  accounts.registerGuest(token);
} else if (operation === 'rotate') {
  const revokeOthers = store.revokeOthers;
  store.revokeOthers = (...args) => {
    revokeOthers(...args);
    crash();
  };
  accounts.rotatePin(token);
} else if (operation === 'commit') {
  accounts.registerGuest(token);
  crash();
} else throw new Error('Unknown crash fixture operation');
throw new Error('Crash fixture unexpectedly returned');
