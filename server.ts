import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import healthHandler from "./api/health.js";
import profileHandler from "./api/profile.js";
import contactHandler from "./api/contact.js";
import type { HttpRequest, HttpResponse } from "./lib/http.js";

type ApiHandler = (req: HttpRequest, res: HttpResponse) => void | Promise<void>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = fs.existsSync(path.join(__dirname, "public"))
  ? __dirname
  : path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const port = Number(process.env.PORT) || 4173;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

const API_ROUTES: Record<string, ApiHandler> = {
  "/api/health": healthHandler,
  "/api/profile": profileHandler,
  "/api/contact": contactHandler,
};

const server = http.createServer(async (req, res) => {
  const urlPath = (req.url || "/").split("?")[0];

  const apiHandler = API_ROUTES[urlPath];
  if (apiHandler) {
    try {
      await apiHandler(req as HttpRequest, res as HttpResponse);
    } catch (err) {
      console.error("[local-server api error]", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "Internal server error" }));
      }
    }
    return;
  }

  const relPath = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.resolve(publicDir, relPath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store, max-age=0",
    });
    res.end(data);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`SureYeah.cv TypeScript server running at http://127.0.0.1:${port}`);
});
