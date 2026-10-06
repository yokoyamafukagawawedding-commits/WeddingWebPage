// HTMLファイルの直接表示ではなく、ローカルHTTPでサイトを確認します。
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = fs.realpathSync(__dirname);
const port = Number(process.argv[2] || 8000);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

http.createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const parts = pathname.split("/").filter(Boolean);
    if (parts.some((part) => part.startsWith("."))) throw new Error("Invalid path");
    const file = fs.realpathSync(path.resolve(root, parts.join("/") || "index.html"));
    const contentType = types[path.extname(file).toLowerCase()];
    if (!file.startsWith(root + path.sep) || !contentType || !fs.statSync(file).isFile()) throw new Error("Not found");
    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    });
    fs.createReadStream(file).pipe(response);
  } catch (_) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).on("error", (error) => {
  console.error(error.code === "EADDRINUSE" ? `ポート${port}は使用中です。別のポート番号を指定してください。` : error.message);
  process.exitCode = 1;
}).listen(port, "127.0.0.1", function () {
  console.log(`確認用サイト: http://127.0.0.1:${this.address().port}/index.html`);
});
