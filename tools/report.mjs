import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';

const RUN = process.argv[2] ?? 'artifacts/gate/manual';
const codesPath = `${RUN}/codes.txt`;
if (!existsSync(codesPath)) {
  console.error(`缺少 ${codesPath}`);
  process.exit(2);
}

const checks = readFileSync(codesPath, 'utf8')
  .split('\n')
  .filter((line) => line.trim().length > 0)
  .map((line) => {
    const [name, raw] = line.trim().split(/\s+/);
    return { name, code: Number(raw), log: `${RUN}/${name}.log` };
  });

const failed = checks.filter((check) => check.code !== 0);
const headPath = `${RUN}/head.txt`;
const statusPath = `${RUN}/git-status.txt`;
const head = existsSync(headPath) ? readFileSync(headPath, 'utf8').trim() : 'unknown';
const dirty = existsSync(statusPath)
  ? readFileSync(statusPath, 'utf8').split('\n').filter((line) => line.trim().length > 0).length
  : -1;

const report = {
  run: RUN,
  generatedAt: new Date().toISOString(),
  head,
  dirtyFiles: dirty,
  passed: failed.length === 0,
  checks: checks.map((check) => ({
    ...check,
    bytes: existsSync(check.log) ? statSync(check.log).size : 0,
  })),
};

writeFileSync(`${RUN}/report.json`, `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  `# 门禁报告 ${RUN}`,
  '',
  `- HEAD：\`${head}\``,
  `- 未提交文件：${dirty}`,
  `- 结论：${failed.length === 0 ? '通过' : `失败（${failed.length} 项）`}`,
  '',
  '| 检查 | 结果 | 日志字节 |',
  '|---|---|---|',
  ...report.checks.map((check) => `| ${check.name} | ${check.code === 0 ? 'PASS' : 'FAIL'} | ${check.bytes} |`),
];
writeFileSync(`${RUN}/report.md`, `${lines.join('\n')}\n`);

console.log(`报告：${RUN}/report.md（${failed.length === 0 ? 'PASS' : 'FAIL'}）`);
process.exit(failed.length === 0 ? 0 : 1);
