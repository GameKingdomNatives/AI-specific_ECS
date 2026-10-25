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

/**
 * 逐个 ref 校验证据：推送不再区分 main 与 feature。
 * 分支 tip 必须有 gate stamp；tag 是历史指针，由 pre-push 单独做「可达性」校验（见 tagTargets）。
 */
export function verifyRefs(root, pushes) {
  return pushes.filter((push) => {
    if (ZERO_SHA.test(push.localSha)) return false;
    if (push.remoteRef.startsWith('refs/tags/')) return false;
    return !verifyStamp(root, push.localSha);
  });
}

/** 被推送的 tag（排除删除）；脚本用 ^{commit} 解引用后再判断可达性。 */
export function tagPushes(pushes) {
  return pushes.filter((push) => push.remoteRef.startsWith('refs/tags/') && !ZERO_SHA.test(push.localSha));
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
