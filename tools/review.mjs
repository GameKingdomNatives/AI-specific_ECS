import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';

const [, , action, ...rest] = process.argv;
if (action !== 'accept' && action !== 'reject') {
  console.error('用法：node tools/review.mjs accept|reject --note "理由" [--tag vX.Y.Z]');
  process.exit(2);
}

function flag(name) {
  const index = rest.indexOf(name);
  return index >= 0 ? (rest[index + 1] ?? '').trim() : '';
}

const note = flag('--note');
if (note.length === 0) {
  console.error('拒收：批阅必须写明理由（--note "..."）。');
  process.exit(2);
}
const tag = flag('--tag');

const now = new Date().toISOString();
const log = existsSync('docs/评审日志.md')
  ? ''
  : '# 批阅记录\n\n| 时间 | 结论 | HEAD | 理由 |\n|---|---|---|---|\n';
mkdirSync('docs', { recursive: true });
if (log.length > 0) writeFileSync('docs/评审日志.md', log);

const head = process.env.GIT_HEAD ?? '(见 gate 报告)';
appendFileSync('docs/评审日志.md', `| ${now} | ${action} | ${head} | ${note} |\n`);
console.log(`已记录：${action} — ${note}`);

function shellQuote(text, shell) {
  return shell === 'ps' ? `'${text.replaceAll("'", "''")}'` : `"${text.replaceAll('"', '\\"')}"`;
}

const next = action === 'accept'
  ? [
      'node tools/gate.mjs',
      tag.length > 0 ? `git tag -a ${tag} -m ${shellQuote(note, 'ps')}` : 'git tag -a <批次标签> -m <说明>',
      'git push --follow-tags',
    ]
  : ['（在原分支继续修）', 'git revert <sha>   # 或继续修，修完重跑门禁', 'node tools/gate.mjs'];

console.log('下一步（PowerShell）：');
for (const line of next) console.log(`  ${line}`);
console.log('下一步（CMD）：');
for (const line of next) console.log(`  ${line.replaceAll("'", '"')}`);
