#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * 文档结构检查：工程文档空间与流程入口必须存在，且不能引用已迁移的旧路径。
 * 目的：结构一旦漂移，门禁先红，不靠人记得"去哪个目录找"。
 */
const ROOT = process.cwd();
const errors = [];

const REQUIRED = [...new Set([
  '工程文档/索引.md',
  '工程文档/项目身份/项目身份.md',
  '工程文档/当前状态.md',
  '工程文档/边界约束.md',
  '工程文档/迭代记录/索引.md',
  '工程文档/验收记录/索引.md',
  '工程文档/验收记录/验收-001-002-首轮.md',
  '工程文档/灵感池/索引.md',
  '工程文档/灵感池/索引.md',
  '工程文档/系统维护/索引.md',
  '工程文档/系统维护/文档与记忆规范.md',
  '工程文档/系统维护/测试方法.md',
  '工程文档/变更记录/索引.md',
  '工程文档/校正记录/索引.md',
  '工程文档/交接/交接清单.md',
  '工程文档/_模板/迭代.md',
  '工程文档/_模板/开工清单.md',
  '工程文档/_模板/收尾清单.md',
  '工程文档/_模板/方向校正.md',
  'docs/workflow/索引.md',
  'docs/workflow/完整工作流.md',
  'docs/workflow/迭代流程.md',
  'docs/交接.md',
  'docs/质量日志.md',
])];

const STALE = [
  'docs/workflow/iterations',
  'docs/workflow/templates',
  'docs/workflow/records',
];

/** 只扫"结构入口"文件；历史变更记录允许提到旧路径。 */
const SCAN = [
  'AGENTS.md',
  'docs/索引.md',
  'docs/workflow/索引.md',
  'docs/workflow/完整工作流.md',
  'docs/workflow/迭代流程.md',
  '工程文档/索引.md',
  '工程文档/当前状态.md',
  '工程文档/交接/交接清单.md',
  '工程文档/系统维护/索引.md',
];

function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

for (const path of REQUIRED) {
  if (!existsSync(join(ROOT, path))) errors.push(`缺少工程文档入口：${path}`);
}

for (const path of SCAN) {
  const full = join(ROOT, path);
  if (!existsSync(full)) continue;
  const text = readFileSync(full, 'utf8');
  for (const stale of STALE) {
    if (text.includes(stale)) errors.push(`${path} 仍引用已迁移路径：${stale}`);
  }
}

/** 迭代记录命名：只允许 README 与 iter-NNN-*.md。 */
for (const file of filesUnder(join(ROOT, '工程文档', '迭代记录'))) {
  const name = relative(join(ROOT, '工程文档', '迭代记录'), file).replaceAll('\\', '/');
  if (name === '索引.md') continue;
  if (!/^迭代-\d{3}-.+\.md$/.test(name)) {
    errors.push(`迭代记录命名不合规：${name}（应为 迭代-NNN-<主题>.md）`);
  }
}

/** 验收记录命名：验收-NNN[-NNN]-<主题>.md。 */
for (const file of filesUnder(join(ROOT, '工程文档', '验收记录'))) {
  const name = relative(join(ROOT, '工程文档', '验收记录'), file).replaceAll('\\', '/');
  if (name === '索引.md') continue;
  if (!/^验收-\d{3}(?:-\d{3})?-.+\.md$/.test(name)) {
    errors.push(`验收记录命名不合规：${name}（应为 验收-NNN[-NNN]-<主题>.md）`);
  }
}

if (errors.length > 0) {
  console.error(`文档结构检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`文档结构检查通过：${REQUIRED.length} 个入口，${SCAN.length} 个入口文件无旧路径`);
