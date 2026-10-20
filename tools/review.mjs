import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';

const [, , action, ...rest] = process.argv;
if (action !== 'accept' && action !== 'reject') {
  console.error('用法：node tools/review.mjs accept|reject --note "理由"');
  process.exit(2);
}

const noteIndex = rest.indexOf('--note');
const note = noteIndex >= 0 ? (rest[noteIndex + 1] ?? '').trim() : '';
if (note.length === 0) {
  console.error('拒收：批阅必须写明理由（--note "..."）。');
  process.exit(2);
}

const now = new Date().toISOString();
const log = existsSync('docs/review-log.md')
  ? ''
  : '# 批阅记录\n\n| 时间 | 结论 | HEAD | 理由 |\n|---|---|---|---|\n';
mkdirSync('docs', { recursive: true });
if (log.length > 0) writeFileSync('docs/review-log.md', log);

const head = process.env.GIT_HEAD ?? '(见 gate 报告)';
appendFileSync('docs/review-log.md', `| ${now} | ${action} | ${head} | ${note} |\n`);

console.log(`已记录：${action} — ${note}`);
if (action === 'accept') {
  console.log('下一步（打标签前先确认全量门禁通过）：');
  console.log('  pnpm gate');
  console.log('  git tag -a v0.1.0-engine-core -m "<批次说明>"');
  console.log('  git push --follow-tags');
} else {
  console.log('下一步（二选一）：');
  console.log('  继续在当前分支修，修完重跑 pnpm gate');
  console.log('  git revert <sha>   # 撤销不合规的提交，撤销后必须重跑门禁');
}
