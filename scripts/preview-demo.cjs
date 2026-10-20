const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = fs.realpathSync(path.join(__dirname, '../dist'));
const headers = Object.fromEntries(require('../vercel.json').headers[0].headers.map(header => [header.key, header.value]));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const port = Number(process.argv[2] || 8090);
http.createServer((request, response) => {
  for (const [key, value] of Object.entries(headers)) response.setHeader(key, value);
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  let filename, size;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    filename = fs.realpathSync(path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname)));
    if (!filename.startsWith(root + path.sep) || !fs.statSync(filename).isFile()) throw Error('Not a static file');
    size = fs.statSync(filename).size;
  } catch { response.writeHead(404); response.end(); return; }
  let start = 0, end = size - 1;
  if (request.headers.range) {
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
    if (range && (range[1] || range[2])) {
      start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
    } else start = -1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) {
      response.writeHead(416, { 'Content-Range': 'bytes */' + size }); response.end(); return;
    }
  }
  const result = { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Content-Length': size ? end - start + 1 : 0 };
  if (request.headers.range) result['Content-Range'] = `bytes ${start}-${end}/${size}`;
  response.writeHead(request.headers.range ? 206 : 200, result);
  if (request.method === 'HEAD' || !size) { response.end(); return; }
  fs.createReadStream(filename, { start, end }).on('error', () => response.destroy()).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`Browser demo: http://127.0.0.1:${port}/`));
