import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { jobs, stateDir } from './jobs.ts';

const args = process.argv.slice(2);
const uninstall = args.includes('--uninstall');
const dry = args.includes('--dry-run');
if (args.some((a) => !['--uninstall', '--dry-run'].includes(a))) throw new Error('Unknown install option');
if (process.platform !== 'darwin') throw new Error('launchd requires macOS');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const agents = path.join(os.homedir(), 'Library/LaunchAgents');
const domain = `gui/${process.getuid!()}`;
const xml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
// Only PATH is saved, never the shell's tokens or environment. Include Node's directory for npm's shebang.
const searchPath = [
  ...new Set(
    [path.dirname(process.execPath), ...(process.env.PATH ?? '').split(path.delimiter), '/usr/bin', '/bin'].filter(
      (p) => path.isAbsolute(p) && !p.includes('/node_modules/') && !p.includes('/.codex/tmp/'),
    ),
  ),
].join(path.delimiter);

for (const [job, spec] of Object.entries(jobs)) {
  const label = `club.boogle.daily.${job}`;
  const file = path.join(agents, `${label}.plist`);
  if (uninstall) {
    console.log(`${dry ? 'Would bootout and remove' : 'Removing'} ${file} (logs and worktrees preserved)`);
    if (!dry) {
      // Only boot out a loaded service; a real bootout failure must not be silently swallowed.
      let loaded = false;
      try {
        execFileSync('launchctl', ['print', `${domain}/${label}`], { stdio: 'ignore' });
        loaded = true;
      } catch {
        /* absent */
      }
      if (loaded) execFileSync('launchctl', ['bootout', `${domain}/${label}`]);
      fs.rmSync(file, { force: true });
    }
    continue;
  }
  const date = new Date();
  if (job === 'scenarios') date.setHours(3, 30, 0, 0);
  else date.setUTCHours(spec.utcHour, spec.minute, 0, 0);
  const hour = date.getHours(),
    minute = date.getMinutes();
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>${xml(process.execPath)}</string><string>${xml(path.join(root, 'dev/daily/run.ts'))}</string><string>${job}</string></array>
<key>WorkingDirectory</key><string>${xml(root)}</string>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml(searchPath)}</string></dict>
<key>StartCalendarInterval</key><dict><key>Hour</key><integer>${hour}</integer><key>Minute</key><integer>${minute}</integer></dict>
<key>ProcessType</key><string>Background</string>
<key>StandardOutPath</key><string>${xml(path.join(stateDir, `${job}.log`))}</string>
<key>StandardErrorPath</key><string>${xml(path.join(stateDir, `${job}.error.log`))}</string>
</dict></plist>
`;
  console.log(
    `${file}: daily ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} local (${Intl.DateTimeFormat().resolvedOptions().timeZone})${job === 'scenarios' ? '' : `; converted from ${spec.utcHour}:${spec.minute} UTC today`}.`,
  );
  if (dry) {
    console.log(plist);
    continue;
  }
  if (Number(process.versions.node.split('.')[0]) < 26) throw new Error('Install using Node 26 or newer');
  if (fs.existsSync(file)) throw new Error(`${file} already exists; uninstall first to replace it`);
  for (const command of ['codex', 'gh', 'npm', 'ffmpeg', 'ffprobe'])
    execFileSync('/usr/bin/which', [command], { env: { ...process.env, PATH: searchPath } });
  fs.mkdirSync(agents, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, plist, { mode: 0o600, flag: 'wx' });
  try {
    execFileSync('plutil', ['-lint', file]);
    execFileSync('launchctl', ['bootstrap', domain, file]);
  } catch (error) {
    fs.rmSync(file, { force: true });
    throw error;
  }
}
