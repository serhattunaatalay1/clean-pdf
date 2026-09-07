// CleanPDF Zero-Dependency Static File Server
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3940;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  let safePath = path.normalize(decodeURIComponent(req.url.split('?')[0]));
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  // Directory traversal guard
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Sayfa Bulunamadı');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

let currentPort = PORT;

function startServer(port) {
  server.listen(port, () => {
    console.log(`========================================================`);
    console.log(`  CleanPDF Kokpiti Aktif!`);
    console.log(`  Adres: http://localhost:${port}`);
    console.log(`  Gizlilik: %100 Yerel, Dosyalar Asla Sunucuya Gitmez`);
    console.log(`========================================================`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[UYARI] Port ${currentPort} zaten kullanimda. Bir sonraki porta geciliyor...`);
    currentPort++;
    setTimeout(() => {
      startServer(currentPort);
    }, 200);
  } else {
    console.error('[HATA] Sunucu baslatilamadi:', err);
  }
});

startServer(currentPort);

