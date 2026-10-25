#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const ROOT = process.cwd();
const TMP = join(ROOT, 'artifacts', '.spawn');

/**
 * 受限沙箱禁止管道子进程（EPERM/EINVAL）。
 * 所有需要读子进程输出的检查统一走文件重定向：stdin/out/err 都是真实文件描述符。
 */
export function capture(command, args, options = {}) {
  mkdirSync(TMP, { recursive: true });
  const id = `${process.pid}-${randomBytes(4).toString('hex')}`;
  const inPath = join(TMP, `${id}.in`);
  const outPath = join(TMP, `${id}.out`);
  const errPath = join(TMP, `${id}.err`);
  writeFileSync(inPath, options.input ?? '');
  const inFd = openSync(inPath, 'r');
  const outFd = openSync(outPath, 'w');
  const errFd = openSync(errPath, 'w');
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    stdio: [inFd, outFd, errFd],
    windowsHide: true,
    shell: options.shell === true,
    ...(options.env === undefined ? {} : { env: options.env }),
  });
  closeSync(inFd);
  closeSync(outFd);
  closeSync(errFd);
  const stdout = readFileSync(outPath, 'utf8');
  const stderr = readFileSync(errPath, 'utf8');
  rmSync(inPath, { force: true });
  rmSync(outPath, { force: true });
  rmSync(errPath, { force: true });
  return { status: result.status, error: result.error, stdout, stderr };
}
