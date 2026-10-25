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
const envPath = `${RUN}/environment.json`;
const head = existsSync(headPath) ? readFileSync(headPath, 'utf8').trim() : 'unknown';
const dirty = existsSync(statusPath)
  ? readFileSync(statusPath, 'utf8').split('\n').filter((line) => line.trim().length > 0).length
  : -1;
const environment = existsSync(envPath) ? JSON.parse(readFileSync(envPath, 'utf8')) : null;

const report = {
  run: RUN,
  generatedAt: new Date().toISOString(),
  head,
  dirtyFiles: dirty,
  passed: failed.length === 0,
  environment,
  checks: checks.map((check) => ({
    ...check,
    bytes: existsSync(check.log) ? statSync(check.log).size : 0,
  })),
};

writeFileSync(`${RUN}/report.json`, `${JSON.stringify(report, null, 2)}\n`);

const envLine = environment === null
  ? '环境：未记录'
  : `环境：node ${environment.node} · ${environment.platform} · pipes ${environment.pipes}`;
const lines = [
  `# 门禁报告 ${RUN}`,
  '',
  `- HEAD：\`${head}\``,
  `- 未提交文件：${dirty}`,
  `- ${envLine}`,
  `- 结论：${failed.length === 0 ? '通过' : `失败（${failed.length} 项）`}`,
  '',
  ...(failed.length > 0 && environment?.pipes === 'blocked'
    ? ['> 环境提示（L3）：管道子进程被禁；依赖子进程的步骤未通过属环境受限，不是违规，但**不计 PASS**。', '']
    : []),
  '| 检查 | 结果 | 日志字节 |',
  '|---|---|---|',
  ...report.checks.map((check) => `| ${check.name} | ${check.code === 0 ? 'PASS' : 'FAIL'} | ${check.bytes} |`),
];
writeFileSync(`${RUN}/report.md`, `${lines.join('\n')}\n`);

console.log(`报告：${RUN}/report.md（${failed.length === 0 ? 'PASS' : 'FAIL'}）`);
process.exit(failed.length === 0 ? 0 : 1);
