// Works out the next staff app version from the commit messages (D32).
// The GitHub workflow build.yml runs it on each push to master.
//
//   node tools/next-version.mjs   →  prints "v1.2.0", or nothing (no release)
//
// Only commits that change staff/ since the last tag "v*" count.
// The first word of the commit subject gives the step:
//   "feat!: ...", "fix!: ..." or "BREAKING CHANGE:" in the body  →  major (2.0.0)
//   "feat: ..." / "feat(sms): ..."                                →  minor (1.1.0)
//   "fix: ..." / "perf: ..."                                      →  patch (1.0.1)
//   anything else ("docs:", "test:", "chore:", no word)           →  no release
// With no tag yet, the first release is v1.0.0.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const STEPS = ['none', 'patch', 'minor', 'major'];
const SUBJECT = /^(\w+)(\([^)]*\))?(!)?:\s/;

// The step of one commit: 'none' | 'patch' | 'minor' | 'major'.
export function stepOf(subject, body = '') {
  const m = SUBJECT.exec(subject);
  if (!m) return 'none';
  const type = m[1].toLowerCase();
  const known = ['feat', 'fix', 'perf'].includes(type);
  if (known && (m[3] || /^BREAKING[ -]CHANGE:/m.test(body))) return 'major';
  if (type === 'feat') return 'minor';
  if (type === 'fix' || type === 'perf') return 'patch';
  return 'none';
}

// lastTag: "v1.2.3" or null. commits: [{ subject, body }].
// Returns the next tag ("v1.3.0"), or null when no commit asks for a release.
export function nextVersion(lastTag, commits) {
  let step = 0;
  for (const c of commits) step = Math.max(step, STEPS.indexOf(stepOf(c.subject, c.body)));
  if (step === 0) return null;
  if (!lastTag) return 'v1.0.0';
  const m = /^v(\d+)\.(\d+)\.(\d+)$/.exec(lastTag);
  if (!m) throw new Error(`Bad tag: ${lastTag}`);
  let [major, minor, patch] = m.slice(1).map(Number);
  if (step === 3) { major += 1; minor = 0; patch = 0; }
  else if (step === 2) { minor += 1; patch = 0; }
  else patch += 1;
  return `v${major}.${minor}.${patch}`;
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

// The highest "vX.Y.Z" tag that is in the history of HEAD, or null.
function lastTag() {
  const tags = git('tag', '--merged', 'HEAD', '--list', 'v*').split('\n')
    .filter(t => /^v\d+\.\d+\.\d+$/.test(t));
  const num = t => t.slice(1).split('.').map(Number);
  tags.sort((a, b) => {
    const [x, y] = [num(a), num(b)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });
  return tags.at(-1) ?? null;
}

function commitsSince(tag) {
  const range = tag ? [`${tag}..HEAD`] : ['HEAD'];
  // \x1f between subject and body, \x1e between commits.
  const out = git('log', ...range, '--format=%s%x1f%b%x1e', '--', '.');
  return out.split('\x1e').map(s => s.trim()).filter(Boolean).map(s => {
    const [subject, body = ''] = s.split('\x1f');
    return { subject: subject.trim(), body };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Run from staff/, so "--" "." means only the commits that change staff/.
  process.chdir(fileURLToPath(new URL('..', import.meta.url)));
  const tag = lastTag();
  const next = nextVersion(tag, commitsSince(tag));
  console.error(`Last tag: ${tag ?? '(none)'}. Next: ${next ?? '(no release)'}.`);
  if (next) console.log(next);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${next ?? ''}\n`);
  }
}
