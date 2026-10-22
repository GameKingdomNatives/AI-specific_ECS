import { renameSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { parseScene } from '@itb/engine/scene';

const MAX_BODY_BYTES = 1_000_000;

function send(response, status, payload) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolveBody, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        reject(new Error('场景请求超过 1MB'));
        request.destroy();
      }
    });
    request.on('end', () => resolveBody(body));
    request.on('error', reject);
  });
}

function targetPath(root, file) {
  if (!/^[A-Za-z0-9._-]+[.]scene[.]json$/.test(file)) {
    return { error: '文件名必须是 <name>.scene.json，且只含字母/数字/._-' };
  }
  const dir = resolve(root, 'scenes');
  const target = resolve(dir, file);
  if (!target.startsWith(`${dir}${sep}`)) {
    return { error: '路径越出 scenes 目录' };
  }
  return { target };
}

/** 开发期保存：校验 scene → 临时文件 → rename 原子替换；仅 dev server 注册。 */
export function sceneSavePlugin() {
  return {
    name: 'itb-scene-save',
    apply: 'serve',
    configureServer(server) {
      const sceneDir = resolve(server.config.root, 'scenes');
      server.watcher.add(sceneDir);
      server.watcher.on('change', (file) => {
        if (file.endsWith('.scene.json')) {
          server.ws.send({ type: 'full-reload' });
        }
      });
      server.middlewares.use('/__scene/save', (request, response) => {
        if (request.method !== 'POST') {
          send(response, 405, { ok: false, error: '只接受 POST' });
          return;
        }
        readBody(request)
          .then((body) => {
            const payload = JSON.parse(body);
            const file = typeof payload?.file === 'string' ? payload.file : '';
            const located = targetPath(server.config.root, file);
            if (located.error !== undefined) {
              send(response, 400, { ok: false, error: located.error });
              return;
            }
            const parsed = parseScene(payload?.scene);
            if (!parsed.ok) {
              send(response, 400, { ok: false, error: '场景校验失败', issues: parsed.issues });
              return;
            }
            const target = located.target;
            const temporary = `${target}.tmp-${process.pid}`;
            writeFileSync(temporary, `${JSON.stringify(parsed.value, null, 2)}\n`, 'utf8');
            renameSync(temporary, target);
            send(response, 200, { ok: true, file, bytes: JSON.stringify(parsed.value).length });
          })
          .catch((error) => {
            send(response, 400, { ok: false, error: String(error instanceof Error ? error.message : error) });
          });
      });
    },
  };
}
