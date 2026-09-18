/**
 * Minimal static server for `dist/`, used by the Playwright smoke tests.
 * Mirrors the nginx rules in docker/nginx.conf: directory URLs serve index.html,
 * missing trailing slashes redirect, unknown paths return 404.html with a 404.
 * Plain Node with no child processes, so the test runner can stop it cleanly.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const root = path.resolve('dist');
const port = Number(process.argv[2] ?? process.env.PORT ?? 4321);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function send(res, status, file) {
  res.writeHead(status, {
    'content-type': types[path.extname(file)] ?? 'application/octet-stream',
  });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);
  const target = path.join(root, pathname);
  if (!target.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(target)) {
    if (statSync(target).isDirectory()) {
      if (!pathname.endsWith('/')) {
        res.writeHead(301, { location: `${pathname}/${url.search}` }).end();
        return;
      }
      const index = path.join(target, 'index.html');
      if (existsSync(index)) return send(res, 200, index);
    } else {
      return send(res, 200, target);
    }
  }
  const notFound = path.join(root, '404.html');
  if (existsSync(notFound)) return send(res, 404, notFound);
  res.writeHead(404).end('Not found');
}).listen(port, () => {
  console.log(`serving ${root} at http://localhost:${port}/`);
});
