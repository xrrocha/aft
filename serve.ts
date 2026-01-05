/**
 * Simple dev server for examples
 *
 * Run with: bun --bun serve.ts
 */

const PORT = 3000;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.ts': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Default to index.html for directories
    if (path.endsWith('/')) {
      path += 'index.html';
    }

    // Try to serve the file
    const filePath = '.' + path;
    const file = Bun.file(filePath);

    if (await file.exists()) {
      const ext = path.substring(path.lastIndexOf('.'));
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      return new Response(file, {
        headers: { 'Content-Type': contentType },
      });
    }

    // 404
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Dev server running at http://localhost:${PORT}`);
console.log(`Examples: http://localhost:${PORT}/examples/`);
