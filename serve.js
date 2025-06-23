import { join } from "path";

const PORT = 8080;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";
    const filePath = join(process.cwd(), pathname);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response("404 Not Found", { status: 404 });
  },
});

console.log(`💿 Serving on http://localhost:${PORT}`);
