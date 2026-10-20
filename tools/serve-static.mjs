import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

/**
 * 零依赖静态服务器：给设计方看静态 Storybook，或预览构建产物。
 * 用法：node tools/serve-static.mjs [目录] [端口]
 */
const dir = resolve(process.argv[2] ?? 'artifacts/storybook-static');
const port = Number(process.argv[3] ?? 7007);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  const target = normalize(join(dir, pathname));
  if (!target.startsWith(dir)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  const file = pathname.endsWith('/') || extname(target) === '' ? join(target, 'index.html') : target;
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
});

server.listen(port, () => {
  console.log(`静态服务：http://localhost:${port}  （目录 ${dir}）`);
});
