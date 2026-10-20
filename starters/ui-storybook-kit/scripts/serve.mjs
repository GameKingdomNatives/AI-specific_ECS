import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

/** 零依赖静态服务：给不会装 Node 工具链的人看构建产物。 */
const dir = resolve(process.argv[2] ?? 'storybook-static');
const port = Number(process.argv[3] ?? 7007);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  const target = normalize(join(dir, path));
  if (!target.startsWith(dir)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  const file = extname(target) === '' ? join(target, 'index.html') : target;
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
}).listen(port, () => {
  console.log(`UI kit: http://localhost:${port}（目录 ${dir}）`);
});
