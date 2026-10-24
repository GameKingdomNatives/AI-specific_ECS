import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ZERO_SHA = /^0+$/;

/** 解析 git pre-push stdin：localRef localSha remoteRef remoteSha。 */
export function parsePushLines(input) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [localRef, localSha, remoteRef] = line.split(/\s+/);
      return { localRef, localSha, remoteRef };
    })
    .filter((entry) => entry.localRef !== undefined && entry.localSha !== undefined && entry.remoteRef !== undefined);
}

/** 直接推送 main（非删除、未显式允许）即拒绝。 */
export function hasDirectMainPush(pushes, allowMainPush = false) {
  if (allowMainPush) return false;
  return pushes.some((push) => push.remoteRef === 'refs/heads/main' && !ZERO_SHA.test(push.localSha));
}

/** 距上次深检 ≥5 个提交且当前 HEAD 没有深检 stamp。 */
export function deepDue(commitsSinceDeep, headHasDeepStamp) {
  return commitsSinceDeep >= 5 && !headHasDeepStamp;
}

export function stampPath(root, head) {
  return join(root, '.gate', 'stamps', `${head}.json`);
}

/** 校验 gate stamp 是否存在且属于当前 HEAD。 */
export function verifyStamp(root, head) {
  const path = stampPath(root, head);
  if (!existsSync(path)) return false;
  try {
    const record = JSON.parse(readFileSync(path, 'utf8'));
    return record.head === head;
  } catch {
    return false;
  }
}
